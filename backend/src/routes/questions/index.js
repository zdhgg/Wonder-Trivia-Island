const express = require("express");
const queryRoutes = require("./queryRoutes");
const mutationRoutes = require("./mutationRoutes");
const aiRoutes = require("./aiRoutes");
const reviewRoutes = require("./reviewRoutes");
const importRoutes = require("./importRoutes");

const router = express.Router();

router.use(queryRoutes);
router.use(mutationRoutes);
router.use(aiRoutes);
router.use(reviewRoutes);
router.use(importRoutes);

module.exports = router;
