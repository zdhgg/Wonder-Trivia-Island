const express = require("express");
const queryRoutes = require("./queryRoutes");
const mutationRoutes = require("./mutationRoutes");
const reviewRoutes = require("./reviewRoutes");
const importRoutes = require("./importRoutes");

const router = express.Router();

router.use(queryRoutes);
router.use(mutationRoutes);
router.use(reviewRoutes);
router.use(importRoutes);

module.exports = router;
