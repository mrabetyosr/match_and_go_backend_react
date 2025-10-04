const fsp = require("fs/promises");
const path = require("path");
const User = require("../models/userModel");
const verifyToken = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadFile");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");



async function cleanupUploadedFile(file) {
  try {
    if (!file) return;
    const fullPath = file.path || path.join(file.destination, file.filename);
    await fsp.unlink(fullPath);
    console.log("[CLEANUP] Fichier supprimé :", fullPath);
  } catch (e) {
    if (e.code !== "ENOENT") {
      console.error("[CLEANUP] Erreur suppression fichier :", e.message);
    }
  }
}
// Update user photo
// only connected user can update his photo

module.exports.updatePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier fourni" });
    }

    // req.user vient de  verifyToken (contient id et role)
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { image_User: req.file.filename },
      { new: true }
    );

    if (!updatedUser) {
      await cleanupUploadedFile(req.file);
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.status(200).json(updatedUser);
  } catch (err) {
    await cleanupUploadedFile(req.file);
    res.status(500).json({ message: err.message });
  }
};

//update cover photo
module.exports.updateCover = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Aucun fichier fourni" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { cover_User: req.file.filename },
            { new: true }
        );

        if (!updatedUser) {
            await cleanupUploadedFile(req.file);
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        res.status(200).json(updatedUser);
    } catch (err) {
        await cleanupUploadedFile(req.file);
        res.status(500).json({ message: err.message });
    }
};


// delete user by id
// only admin can delete user
module.exports.DeleteUserById = async (req, res) => {
  try {
    const id = req.params.id;

    const token = req.headers.authorization?.split(" ")[1]; // Bearer token
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });


    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Assure-toi que JWT_SECRET est défini
    const connectedUser = await userModel.findById(decoded.id);

    if (!connectedUser || connectedUser.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Only admins can delete users." });
    }

   
    const userToDelete = await userModel.findById(id);
    if (!userToDelete) {
      return res.status(404).json({ message: "User not found." });
    }

   
    if (!["candidate", "company"].includes(userToDelete.role)) {
      return res.status(403).json({ message: "You can only delete users with role candidate or company." });
    }

    
    await userModel.findByIdAndDelete(id);

    res.status(200).json({ message: "User deleted successfully." });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Update user information
// only connected user can update his information

module.exports.updateUserInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, image_User, email, candidateInfo, companyInfo } = req.body || {};

    const updateData = {};

    // -----------------------------
    // Update username
    // -----------------------------
    if (username) {
      const existingUser = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ message: "Username déjà utilisé" });
      }
      updateData.username = username;
    }

    // -----------------------------
    // Update email
    // -----------------------------
    if (email) {
      const existingEmail = await User.findOne({ email, _id: { $ne: userId } });
      if (existingEmail) {
        return res.status(400).json({ message: "Email déjà utilisé" });
      }
      updateData.email = email;
    }

    // -----------------------------
    // Update profile image
    // -----------------------------
    if (image_User) {
      updateData.image_User = image_User;
    }

    // -----------------------------
    // Update candidate info
    // -----------------------------
if (candidateInfo) {
  const candidate = typeof candidateInfo === "string" ? JSON.parse(candidateInfo) : candidateInfo;
  
  // Merge with existing candidateInfo
  const existingCandidateInfo = (await User.findById(userId)).candidateInfo || {};
  updateData.candidateInfo = { ...existingCandidateInfo };
  
  const allowedFields = ["phoneNumber", "location", "dateOfBirth"];
  allowedFields.forEach(field => {
    if (candidate[field] !== undefined) {
      updateData.candidateInfo[field] = candidate[field];
    }
  });
}


    // -----------------------------
    // Update company info
    // -----------------------------
if (companyInfo) {
  const company = typeof companyInfo === "string" ? JSON.parse(companyInfo) : companyInfo;

  // Merge avec l'existant
  const existingCompanyInfo = (await User.findById(userId)).companyInfo || {};
  updateData.companyInfo = { ...existingCompanyInfo };

  const allowedFields = ["description", "location", "category", "founded", "size", "website", "socialLinks", "coordinates"];

  allowedFields.forEach(field => {
    if (company[field] !== undefined) {
      if (field === "socialLinks") {
        if (typeof company[field] === "string") {
          updateData.companyInfo[field] = JSON.parse(company[field]);
        } else {
          updateData.companyInfo[field] = {
            ...existingCompanyInfo.socialLinks,
            ...company[field],
          };
        }
      } else if (field === "coordinates" && typeof company[field] === "object") {
        updateData.companyInfo.coordinates = {
          ...existingCompanyInfo.coordinates,
          lat: company[field].lat,
          lng: company[field].lng,
        };
      } else {
        updateData.companyInfo[field] = company[field];
      }
    }
  });
}


    // -----------------------------
    // Update the user
    // -----------------------------
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.status(200).json(updatedUser);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur: " + err.message });
  }
};



// Get all candidates
module.exports.getAllCandidates = async (req, res) => {
  try {
    const candidates = await User.find({ role: "candidate" });

    if (!candidates || candidates.length === 0) {
      return res.status(404).json({ message: "No candidates found" });
    }

    res.status(200).json({ candidates });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Get all companies
module.exports.getAllCompany = async (req, res) => {
  try {
    // Find users where role is "company"
    const companies = await User.find({ role: "company" });

    res.status(200).json({ companies });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get companies by category
module.exports.getCompaniesByCategory = async (req, res) => {
  try {
    const { category } = req.params;

  
    const validCategories = [
    "Tech",
    "Advertising&Marketing",
    "Culture&Media",
    "Consulting&Audit",
    "Education&Training",
    "Finance&Banking"

    ];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    
    const companies = await User.find({ 
      role: "company", 
      "companyInfo.category": category 
    });

    if (!companies || companies.length === 0) {
      return res.status(404).json({ message: `No companies found in category ${category}` });
    }

    res.status(200).json({ companies });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


////////////////// nbr company /////////////////////////////////////

module.exports.nbrcompany = async (req, res) => {
  try {
    // Compter tous les utilisateurs dont le rôle est "company"
    const count = await User.countDocuments({ role: "company" });

    res.status(200).json({ totalCompanies: count });
  } catch (error) {
    console.error("Error fetching company count:", error.message); // log côté serveur
    res.status(500).json({ 
      message: "Failed to get the number of companies.", 
      error: error.message 
    });
  }
};



///////////////// nbr condidates ////////////////////////////////


module.exports.nbrCandidate = async (req, res) => { 
  try {
    // Récupérer le token depuis les headers Authorization
    const token = req.headers.authorization?.split(" ")[1]; // Bearer token
    if (!token) 
      return res.status(401).json({ message: "Access denied. No token provided." });

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    // Vérifier que l'utilisateur est admin
    if (!connectedUser || connectedUser.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Only admins can view candidate count." });
    }

    // Compter les utilisateurs de type candidate
    const count = await User.countDocuments({ role: "candidate" });

    // Retourner le résultat
    res.status(200).json({ totalCandidates: count });

  } catch (err) {
    console.error("Error fetching candidate count:", err.message);
    res.status(500).json({ message: "Failed to get candidate count.", error: err.message });
  }
};


///////////////// getAllUserCounts ////////////////////////////////

module.exports.getAllUserCounts = async (req, res) => {
  try {
    // Récupérer le token depuis les headers Authorization
    const token = req.headers.authorization?.split(" ")[1]; // Bearer token
    if (!token) 
      return res.status(401).json({ message: "Access denied. No token provided." });

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    // Vérifier que l'utilisateur est admin
    if (!connectedUser || connectedUser.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Only admins can view user counts." });
    }

    // Compter les utilisateurs par rôle
    const companyCount = await User.countDocuments({ role: "company" });
    const candidateCount = await User.countDocuments({ role: "candidate" });

    // Retourner les résultats
    res.status(200).json({ 
      totalCompanies: companyCount,
      totalCandidates: candidateCount
    });

  } catch (err) {
    console.error("Error fetching user counts:", err.message);
    res.status(500).json({ message: "Failed to get user counts.", error: err.message });
  }
};


///////////////// nbrCandidateLastWeek ////////////////////////////////

module.exports.nbrCandidateLastWeek = async (req, res) => {
  try {
    // Récupérer le token depuis les headers Authorization
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) 
      return res.status(401).json({ message: "Access denied. No token provided." });

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    // Vérifier que l'utilisateur est admin
    if (!connectedUser || connectedUser.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Only admins can view user counts." });
    }

    // Calculer la date d'il y a 7 jours
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Compter les candidats connectés dans la dernière semaine
    const count = await User.countDocuments({
      role: "candidate",
      updatedAt: { $gte: sevenDaysAgo } // utilisateurs mis à jour dans la dernière semaine
    });

    res.status(200).json({ totalCandidatesLastWeek: count });

  } catch (err) {
    console.error("Error fetching candidate count for last week:", err.message);
    res.status(500).json({ message: "Failed to get candidate count.", error: err.message });
  }
};

///////////////// getCompaniesByCategory ////////////////////////////////


module.exports.getCompaniesByCategory = async (req, res) => {
  try {
    const category = req.params.category;

    if (!category) {
      return res.status(400).json({ message: "Category parameter is required" });
    }

    const companies = await User.find({
      role: "company",
      "companyInfo.category": { $regex: new RegExp(`^${category}$`, "i") } // insensible à la casse
    });

    if (!companies.length) {
      return res.status(404).json({ message: `No companies found for category: ${category}` });
    }

    res.status(200).json({
      total: companies.length,
      companies
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//////////////////// get current logged-in user///////////////////
module.exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id; // req.user comes from verifyToken middleware

    // Find user by ID, include all fields except password
    const user = await User.findById(userId).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user); // send all user data
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
};




module.exports.toggleSaveJob = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) 
      return res.status(401).json({ message: "Access denied. No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (!connectedUser) {
      return res.status(403).json({ message: "User not found." });
    }

    const { offerId } = req.params;
    
    // Assurez-vous que savedJobs existe
    if (!connectedUser.candidateInfo) connectedUser.candidateInfo = {};
    if (!connectedUser.candidateInfo.savedJobs) connectedUser.candidateInfo.savedJobs = [];

    const index = connectedUser.candidateInfo.savedJobs.indexOf(offerId);
    if (index > -1) {
      connectedUser.candidateInfo.savedJobs.splice(index, 1); // unsave
    } else {
      connectedUser.candidateInfo.savedJobs.push(offerId);    // save
    }

    await connectedUser.save();
    res.json({ savedJobs: connectedUser.candidateInfo.savedJobs });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports.getSavedJobs = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      return res.status(401).json({ message: "Access denied. No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (!connectedUser) {
      return res.status(403).json({ message: "User not found." });
    }

    if (!connectedUser.candidateInfo) connectedUser.candidateInfo = {};
    if (!connectedUser.candidateInfo.savedJobs) connectedUser.candidateInfo.savedJobs = [];

    res.json({ savedJobs: connectedUser.candidateInfo.savedJobs });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};



module.exports.getuserforrating = async (req, res) => {
  try {
    const userId = req.user?.id; // middleware JWT doit définir req.user
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId).select("username email loginCount hasRatedApp");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      id: user._id,
      username: user.username,
      email: user.email,
      loginCount: user.loginCount || 0,
      hasRatedApp: user.hasRatedApp || false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
/////////////////////
// Add these methods to your userController.js

// Get user by ID with full details
module.exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify admin access
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);
    
    if (!connectedUser || connectedUser.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Only admins can access user details." });
    }

    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all users with pagination and filtering
module.exports.getAllUsersWithDetails = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);
    
    if (!connectedUser || connectedUser.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Only admins can access user list." });
    }

    const { page = 1, limit = 10, role, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build filter object
    const filter = {};
    if (role && role !== 'all') {
      filter.role = role;
    }
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(filter)
      .select('-password')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const totalUsers = await User.countDocuments(filter);

    res.status(200).json({
      users,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
      totalUsers,
      hasNextPage: page < Math.ceil(totalUsers / limit),
      hasPrevPage: page > 1
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user status (activate/deactivate)
module.exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);
    
    if (!connectedUser || connectedUser.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Only admins can update user status." });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Don't allow deactivating other admins
    if (user.role === "admin" && !isActive) {
      return res.status(403).json({ message: "Cannot deactivate admin users." });
    }

    user.isActive = isActive;
    await user.save();

    res.status(200).json({ 
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully.`,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user statistics for dashboard
module.exports.getUserStats = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);
    
    if (!connectedUser || connectedUser.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Only admins can access user statistics." });
    }

    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = await Promise.all([
      // Total counts
      User.countDocuments({}),
      User.countDocuments({ role: 'candidate' }),
      User.countDocuments({ role: 'company' }),
      User.countDocuments({ role: 'admin' }),
      
      // Active users
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
      
      // Recent registrations
      User.countDocuments({ createdAt: { $gte: last30Days } }),
      User.countDocuments({ createdAt: { $gte: last7Days } }),
      
      // Active companies with subscriptions
      User.countDocuments({ role: 'company', isActive: true, stripeCustomerId: { $exists: true } }),
    ]);

    res.status(200).json({
      totalUsers: stats[0],
      totalCandidates: stats[1],
      totalCompanies: stats[2],
      totalAdmins: stats[3],
      activeUsers: stats[4],
      inactiveUsers: stats[5],
      newUsersLast30Days: stats[6],
      newUsersLast7Days: stats[7],
      companiesWithSubscription: stats[8]
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Bulk actions for users
module.exports.bulkUserActions = async (req, res) => {
  try {
    const { userIds, action } = req.body;
    
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);
    
    if (!connectedUser || connectedUser.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Only admins can perform bulk actions." });
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "User IDs array is required." });
    }

    let result;
    switch (action) {
      case 'activate':
        result = await User.updateMany(
          { _id: { $in: userIds }, role: { $ne: 'admin' } },
          { isActive: true }
        );
        break;
      case 'deactivate':
        result = await User.updateMany(
          { _id: { $in: userIds }, role: { $ne: 'admin' } },
          { isActive: false }
        );
        break;
      case 'delete':
        result = await User.deleteMany(
          { _id: { $in: userIds }, role: { $in: ['candidate', 'company'] } }
        );
        break;
      default:
        return res.status(400).json({ message: "Invalid action. Use 'activate', 'deactivate', or 'delete'." });
    }

    res.status(200).json({
      message: `Bulk ${action} completed successfully.`,
      modifiedCount: result.modifiedCount || result.deletedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Export recent user activity
module.exports.getRecentUserActivity = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);
    
    if (!connectedUser || connectedUser.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Only admins can access user activity." });
    }

    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const recentUsers = await User.find({
      $or: [
        { createdAt: { $gte: startDate } },
        { updatedAt: { $gte: startDate } }
      ]
    })
    .select('username email role createdAt updatedAt isActive loginCount')
    .sort({ updatedAt: -1 })
    .limit(50);

    res.status(200).json({
      recentActivity: recentUsers,
      totalCount: recentUsers.length,
      period: `${days} days`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};