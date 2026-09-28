const express = require("express");
const { requireImportAccess } = require("./questions/shared");
const {
  getProposal,
  listProposals,
  parseProposalId,
  reviewProposal
} = require("../services/externalAiProposals");

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
