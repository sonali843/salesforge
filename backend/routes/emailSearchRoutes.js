const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/emailSearchController");
const { protect } = require("../middleware/authMiddleware");
const tenantScope = require("../middleware/tenant");

router.use(protect, tenantScope);

router.post("/", ctrl.emailSearch);
router.post("/find", ctrl.findEmail);
router.get("/history", ctrl.history);

module.exports = router;
