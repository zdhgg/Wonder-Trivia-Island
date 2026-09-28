const express = require("express");
const { requireImportAccess } = require("./questions/shared");
const {
  getProposal,
  listProposals,
  parseProposalId,
  reviewProposal
} = require("../services/externalAiProposals");
const {
  createTeachingDemoRequest,
  getTeachingDemoState,
  reviewTeachingDemoDraft
} = require("../services/teachingDemoDrafts");

const router = express.Router();

router.use(requireImportAccess);

router.get("/", (req, res, next) => {
  const status = String(req.query?.status || "").trim();

  try {
    res.json(listProposals(req.db, { status, limit: 100, offset: 0 }));
  } catch (error) {
    res.status(400).json({ message: error.message || "proposal 查询失败。" });
  }
});

function requireProposalOr404(req, res) {
  const proposalId = parseProposalId(req.params.id);

  if (!proposalId) {
    res.status(400).json({ message: "proposal id 必须是正整数。" });
    return null;
  }

  const proposal = getProposal(req.db, proposalId);

  if (!proposal) {
    res.status(404).json({ message: "proposal 不存在。" });
    return null;
  }

  return proposal;
}

// 管理页状态读取：返回「请求状态 + 草稿」。浏览器只读，不触发任何生成。
router.get("/:id/teaching-demo", (req, res, next) => {
  const proposal = requireProposalOr404(req, res);

  if (!proposal) {
    return;
  }

  try {
    res.json({ data: getTeachingDemoState(req.db, proposal.id) });
  } catch (error) {
    next(error);
  }
});

// 用户点击“制作教学演示草稿”：只登记「待外部生成」请求，不调用任何模型。
// 教学演示内容由外部 Harness 通过 External AI Gateway 提交。
router.post("/:id/teaching-demo/request", (req, res, next) => {
  const proposal = requireProposalOr404(req, res);

  if (!proposal) {
    return;
  }

  try {
    const result = createTeachingDemoRequest(req.db, proposal.id);

    if (result.kind === "proposalNotAccepted") {
      res.status(409).json({ message: "只有 accepted proposal 才能请求制作教学演示草稿。" });
      return;
    }

    if (result.kind === "missingIntervention") {
      res.status(400).json({ message: "proposal 没有合法的 teachingIntervention。" });
      return;
    }

    if (result.kind === "unsupportedIntervention") {
      res.status(409).json({
        message:
          result.interventionType === "guided_example"
            ? "guided_example 第一版只展示 AI 推荐，暂未支持制作演示。"
            : "practice 不制作教学演示草稿。"
      });
      return;
    }

    if (result.kind === "draftApproved") {
      res.status(409).json({ message: "教学演示草稿已经确认可用，不能覆盖。", data: result.draft });
      return;
    }

    if (result.kind !== "created" && result.kind !== "existing" && result.kind !== "renewed") {
      res.status(400).json({ message: "教学演示请求登记失败。" });
      return;
    }

    res.status(result.kind === "created" ? 201 : 200).json({
      data: getTeachingDemoState(req.db, proposal.id)
    });
  } catch (error) {
    next(error);
  }
});

function handleDraftReview(status) {
  return (req, res, next) => {
    const proposal = requireProposalOr404(req, res);

    if (!proposal) {
      return;
    }

    try {
      const state = getTeachingDemoState(req.db, proposal.id);

      if (!state?.draft) {
        res.status(404).json({ message: "教学演示草稿不存在。" });
        return;
      }

      const result = reviewTeachingDemoDraft(req.db, state.draft.id, status, req.body?.reviewNote);

      if (result.kind === "alreadyReviewed") {
        res.status(409).json({ message: "教学演示草稿已经审核过了。", data: result.draft });
        return;
      }

      if (result.kind === "proposalNotAccepted") {
        res.status(409).json({ message: "只有 accepted proposal 的草稿才能审核。" });
        return;
      }

      if (result.kind !== "updated") {
        res.status(400).json({ message: "教学演示草稿审核状态无效。" });
        return;
      }

      res.json({ data: getTeachingDemoState(req.db, proposal.id) });
    } catch (error) {
      next(error);
    }
  };
}

router.post("/:id/teaching-demo/approve", handleDraftReview("approved"));
router.post("/:id/teaching-demo/reject", handleDraftReview("rejected"));

router.get("/:id", (req, res, next) => {
  const proposalId = parseProposalId(req.params.id);

  if (!proposalId) {
    res.status(400).json({ message: "proposal id 必须是正整数。" });
    return;
  }

  try {
    const proposal = getProposal(req.db, proposalId);

    if (!proposal) {
      res.status(404).json({ message: "proposal 不存在。" });
      return;
    }

    res.json({ data: proposal });
  } catch (error) {
    next(error);
  }
});

function handleReview(status) {
  return (req, res, next) => {
    const proposalId = parseProposalId(req.params.id);

    if (!proposalId) {
      res.status(400).json({ message: "proposal id 必须是正整数。" });
      return;
    }

    try {
      const result = reviewProposal(req.db, proposalId, status, req.body?.reviewNote);

      if (result.kind === "invalid") {
        res.status(400).json({ message: "审核状态无效。" });
        return;
      }

      if (result.kind === "missing") {
        res.status(404).json({ message: "proposal 不存在。" });
        return;
      }

      if (result.kind === "alreadyReviewed") {
        res.status(409).json({
          message: "proposal 已经审核过了。",
          data: result.proposal
        });
        return;
      }

      res.json({ data: result.proposal });
    } catch (error) {
      next(error);
    }
  };
}

router.post("/:id/accept", handleReview("accepted"));
router.post("/:id/reject", handleReview("rejected"));

module.exports = router;
