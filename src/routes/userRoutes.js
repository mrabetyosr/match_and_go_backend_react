const express = require("express");
const verifyToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const { updatePhoto,DeleteUserById,getAllCandidates, updateUserInfo, getAllCompany, updateCover,getCompaniesByCategory,getCurrentUser} = require("../controllers/userController");
const uploadfile = require("../middleware/uploadFile");
const postController = require("../controllers/postController");
const commentController = require("../controllers/commentController");
const replyController = require("../controllers/replyController");
const reactionController = require("../controllers/reactionController");
const shareController = require("../controllers/shareController");
const userController = require("../controllers/userController");
const { toggleSaveJob,getSavedJobs  } = require("../controllers/userController");


const router = express.Router();

//only admin can access this route
router.get("/admin", verifyToken, authorizeRoles("admin"), (req, res) => {
    res.json({ message: "welcome admin" });

});
//only admin and recruter  can access this route
router.get("/company", verifyToken, authorizeRoles("company", "admin"), (req, res) => {
    res.json({ message: "welcome company" });
});

//all can access this route
router.get("/candidate", verifyToken, authorizeRoles("candidate", "admin", "company"), (req, res) => {
    res.json({ message: "welcome candidate" });
});

// Update user photo
router.put(
  "/update-photo",
  verifyToken,
  uploadfile.single("image_User"), 
  updatePhoto
);
// Upload single file pour cover_User
router.put(
    "/update-cover",
    verifyToken,
    uploadfile.single("cover_User"),
    updateCover
);

// Delete user by ID
router.delete("/delete/:id", verifyToken, authorizeRoles("admin"), DeleteUserById);

//update user info 
router.put("/update", verifyToken, updateUserInfo);
//get all candidates
router.get("/getAllCandidates", getAllCandidates);
//get all companies
router.get("/getAllCompany", getAllCompany);
// Get companies by category
router.get("/getCompaniesByCategory/:category", getCompaniesByCategory);


/////////////////////// API returns total companies, candidates, and users, and number of candidates registered in the last 7 days, and the category of the company ///////////////////////

// GET /nbrcompany → returns the total number of registered companies
router.get("/nbrcompany", userController.nbrcompany);  

// GET /candidates/count → returns the total number of registered candidates (admin only, requires token)
router.get("/candidates/count", verifyToken, authorizeRoles("admin"), userController.nbrCandidate); 

// GET /companycondidate/counts → returns total counts of companies, candidates, and users (admin only, requires token)
router.get("/companycondidate/counts",verifyToken,authorizeRoles("admin"),userController.getAllUserCounts); 

//  returns the number of candidates registered in the last 7 days (admin only, requires token)
router.get("/candidates/last-week",verifyToken,authorizeRoles("admin"),userController.nbrCandidateLastWeek); 

// GET /companies/category/:category → retrieve all companies by a specific category (public route)
router.get("/companies/category/:category", userController.getCompaniesByCategory);


/////////////////////// POST & SHARE ROUTES → create, list, share posts and get share counts ///////////////////////

// create a new post (only candidate or company, requires token, supports photo upload)
router.post(
  "/posts/create",
  verifyToken,
  authorizeRoles("candidate", "company"),
  uploadfile.fields([
    { name: "photo", maxCount: 1 },
    { name: "document", maxCount: 1 }
  ]),
  postController.creerPost
);
// GET /posts → retrieve all posts (accessible by candidate, company, or admin, requires token)
router.get("/posts",verifyToken,authorizeRoles("candidate", "company", "admin"),postController.listPosts);

// GET /:userId/posts → retrieve all posts created by a specific user (candidate, company, or admin; requires token)
router.get("/:userId/posts",verifyToken,authorizeRoles("candidate", "company", "admin"),postController.listPostsByUser);

// PUT /post/update/:id → update an existing post by ID (only candidate or company, requires token, supports photo upload)
router.put("/post/update/:id",verifyToken,authorizeRoles("candidate", "company"),uploadfile.single("photo"),postController.updatePost);

// DELETE /post/delete/:id → delete a post by ID (accessible by candidate, company, or admin; requires token)
router.delete("/post/delete/:id",verifyToken,authorizeRoles("candidate", "company","admin"),postController.removePost);


/////////////////////// COMMENT ROUTES → create, list comments ///////////////////////

// POST /posts/:postId/comments → create a new comment on a post (only candidate or company, requires token)
router.post("/posts/:postId/comments",verifyToken,authorizeRoles("candidate", "company"),commentController.creercommentaire);

// PUT /comments/:commentId → update an existing comment by ID (only candidate or company, requires token)
router.put("/comments/:commentId",verifyToken,authorizeRoles("candidate", "company"),commentController.updateCommentaire);

// DELETE /comments/:commentId → delete a comment by ID (only candidate or company, requires token)
router.delete("/comments/:commentId",verifyToken,authorizeRoles("candidate", "company"),commentController.deleteCommentaire);

// GET /posts/:postId/comments → retrieve all comments for a specific post (accessible by candidate, company, or admin; requires token)
router.get("/posts/:postId/comments",verifyToken,authorizeRoles("candidate", "company", "admin"),commentController.getCommentsByPost);

// GET /posts/:id/comment-count → get the total number of comments for a specific post (accessible by candidate or company, requires token)
router.get("/posts/:id/comment-count",verifyToken,authorizeRoles("candidate", "company"),commentController.countComment);



/////////////////////// REPLY ROUTES → manage replies to comments (create, delete, etc.) ///////////////////////

// POST /comments/:commentId/replies → create a reply to a specific comment (only candidate or company, requires token)
router.post("/comments/:commentId/replies",verifyToken,authorizeRoles("candidate", "company"),replyController.creerreplycomment);

// DELETE /replies/:replyId → delete a reply by ID (accessible by candidate, company, or admin; requires token)
router.delete("/replies/:replyId",verifyToken,authorizeRoles("candidate", "company", "admin"),replyController.deletereply);


/////////////////////// REACTION POST ROUTES → manage reactions on posts (create, list, count) ///////////////////////

// POST /posts/:postId/reactions → add a reaction to a specific post (only candidate or company, requires token)
router.post("/posts/:postId/reactions",verifyToken,authorizeRoles("candidate", "company"),reactionController.creatreact);

// GET /posts/:postId/reactions/count → get the total number of reactions for a specific post (only candidate or company, requires token)
router.get("/posts/:postId/reactions/count",verifyToken,authorizeRoles("candidate", "company"),reactionController.getreacetcount);

// GET /posts/:postId/reactions → list all reactions for a specific post (only candidate or company, requires token)
router.get("/posts/:postId/reactions",verifyToken,authorizeRoles("candidate", "company"),reactionController.listReactionsPost);



/////////////////////// SHARE POST MODEL → manage post sharing and track share counts ///////////////////////

// POST /posts/:id/share → share a specific post (only candidate or company, requires token)
router.post("/posts/:id/share",verifyToken,authorizeRoles("candidate", "company"),shareController.sharePost);

// GET /posts/:id/share-count → get the total number of shares for a specific post (only candidate or company, requires token)
router.get("/posts/:id/share-count",verifyToken,authorizeRoles("candidate", "company"),shareController.getShareCountByPost);

// GET /:userId/shared-posts → retrieve all posts shared by a specific user (candidate, company, or admin; requires token)
router.get("/:userId/shared-posts",verifyToken,authorizeRoles("candidate", "company", "admin"),shareController.listSharedPostsByUser);



/////////////////////// COMMENT REACTION ROUTES → manage reactions on comments (create, list, count) ///////////////////////

// POST /comments/:commentId/reactions → add a reaction to a specific comment (only candidate or company, requires token)
router.post("/comments/:commentId/reactions",verifyToken,authorizeRoles("candidate", "company"),reactionController.creatreact);

// GET /comments/:commentId/reactions/count → get the total number of reactions for a specific comment (only candidate or company, requires token)
router.get("/comments/:commentId/reactions/count",verifyToken,authorizeRoles("candidate", "company"),reactionController.getreacetcount);

// GET /comments/:commentId/reactions → list all reactions for a specific comment (only candidate or company, requires token)
router.get("/comments/:commentId/reactions",verifyToken,authorizeRoles("candidate", "company"),reactionController.listReactionsComment);





/////////////////////// REPLY REACTION ROUTES → manage reactions on replies (create, list, count) ///////////////////////

// POST /replies/:replyId/reactions → add a reaction to a specific reply (only candidate or company, requires token)
router.post("/replies/:replyId/reactions",verifyToken,authorizeRoles("candidate", "company"),reactionController.postreactreply);

// GET /replies/:replyId/reactions/count → get the total number of reactions for a specific reply (only candidate or company, requires token)
router.get("/replies/:replyId/reactions/count",verifyToken,authorizeRoles("candidate", "company"),reactionController.countreactreply);

// GET /replies/:replyId/reactions → list all reactions for a specific reply (only candidate or company, requires token)
router.get("/replies/:replyId/reactions",verifyToken,authorizeRoles("candidate", "company"),reactionController.listReactionsReply);

////////:::::::get current user info ::::::::::////////
router.get("/me", verifyToken, getCurrentUser);





router.delete(
  "/posts/:postId/reactions",
  verifyToken,
  authorizeRoles("candidate", "company"),
  reactionController.removeReaction
);

// Supprimer reaction sur un commentaire
router.delete(
  "/comments/:commentId/reactions",
  verifyToken,
  authorizeRoles("candidate", "company"),
  reactionController.removeReaction
);

// Supprimer reaction sur une réponse (reply)
router.delete(
  "/replies/:replyId/reactions",
  verifyToken,
  authorizeRoles("candidate", "company"),
  reactionController.removeReaction
);


router.get("/saved-jobs", getSavedJobs);


router.post("/save-job/:offerId", toggleSaveJob);

module.exports = router;