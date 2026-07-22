const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/adminController");
const { isAdmin, protect } = require("../middleware/authMiddleware");

// Admin login endpoint — supports both Email/Password and Google OAuth
router.post("/login", ctrl.adminLogin);
router.get("/dashboard", protect, isAdmin, ctrl.getDashboardSummary);
router.get("/users", protect, isAdmin, ctrl.listAllUsers);
router.patch("/users/:id", protect, isAdmin, ctrl.updateUser);
router.get("/platform-stats", protect, isAdmin, ctrl.getPlatformStats);
router.post("/system-event", protect, isAdmin, ctrl.triggerSystemEvent);

module.exports = router;
