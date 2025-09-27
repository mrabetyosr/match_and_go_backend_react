const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const path = require("path");
const fetch = require("node-fetch");
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// utils/recaptcha.js
const verifyCaptchaToken = async (captchaToken) => {
  if (!captchaToken) throw new Error("Captcha token missing");

  // 👉 Utilise la clé de test si NODE_ENV !== "production"
  const secretKey =
    process.env.NODE_ENV === "production"
      ? process.env.RECAPTCHA_SECRET_KEY // vraie clé en prod
      : "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"; // clé de test Google

  const response = await fetch(
    "https://www.google.com/recaptcha/api/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secretKey}&response=${captchaToken}`,
    }
  );

  const data = await response.json();
  if (!data.success) {
    console.error("Captcha verification failed:", data);
    throw new Error("Captcha verification failed");
  }

  return data;
};

// ============================================
// DÉFINITION DES PLANS DE PAIEMENT
// ============================================

const PAYMENT_PLANS = {
  lite: {
    id: 'lite',
    name: 'Lite Plan',
    priceId: 'price_1SAYphQ3xtNTxTGgYSZchWpn',
  },
  pro: {
    id: 'pro',
    name: 'Pro Plan',
    priceId: 'price_1SBa3kQ3xtNTxTGgafIbfeNf',
  }
};



const upgradePlanWithoutProtect = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token missing" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role !== "company") return res.status(403).json({ message: "Only companies can upgrade" });
    if (!user.planInfo || user.planInfo.planId !== "lite") {
      return res.status(400).json({ message: "Upgrade available only for Lite plan" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer: user.stripeCustomerId,
      line_items: [
        {
          price: PAYMENT_PLANS.pro.priceId,
          quantity: 1
        }
      ],
      success_url: `${process.env.CLIENT_URL}/dashboard?upgrade=success`,
      cancel_url: `${process.env.CLIENT_URL}/dashboard?upgrade=cancel`,
    });

    res.status(200).json({ checkoutUrl: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
// ============================================
// OBTENIR LES PLANS DISPONIBLES
// ============================================

const getPlans = async (req, res) => {
  try {
    res.status(200).json({
      plans: Object.values(PAYMENT_PLANS),
      message: "Available payment plans"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// REGISTRATION AVEC SÉLECTION DE PLAN
// ============================================

const register = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      role,
      location,
      category,
      founded,
      size,
      website,
      linkedin,
      coordinates,
      captchaToken,
      planId // ✅ NOUVEAU : ID du plan sélectionné (lite ou pro)
    } = req.body;

    // Vérification reCAPTCHA
    await verifyCaptchaToken(captchaToken);

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ CORRIGÉ : Cas "candidate" → inscription gratuite
    if (role !== "company") {
      // Vérifier si l'email existe déjà pour les candidates
      const existingCandidate = await User.findOne({ email });
      if (existingCandidate) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const newUser = new User({
        username,
        email,
        password: hashedPassword,
        role: "candidate"
      });

      await newUser.save();

      // Générer token automatiquement pour les candidates
      const token = jwt.sign(
        { id: newUser._id, role: newUser.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      return res.status(201).json({
        message: `Candidate registered with username ${username}`,
        role: newUser.role,
        token,
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role
        }
      });
    }

    // ✅ CAS COMPANY : Validation du plan
    if (!planId || !PAYMENT_PLANS[planId]) {
      return res.status(400).json({ 
        message: "Valid plan selection required",
        availablePlans: Object.keys(PAYMENT_PLANS)
      });
    }

    // Cas "company" → Vérifier si email existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const selectedPlan = PAYMENT_PLANS[planId];

    // Créer Stripe Customer avec informations du plan
    const stripeCustomer = await stripe.customers.create({
      email,
      name: username,
      metadata: { 
        role: "company",
        selectedPlan: planId,
        pendingData: JSON.stringify({
          username,
          email,
          password: hashedPassword,
          location,
          category,
          founded,
          size,
          website,
          linkedin,
          coordinates: coordinates || null,
          planId: planId
        })
      }
    });

    // ✅ Session Stripe avec le plan sélectionné
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer: stripeCustomer.id,
      line_items: [
        {
          price: selectedPlan.priceId, // ✅ Utilise le priceId du plan sélectionné
          quantity: 1
        }
      ],
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/register?error=payment_cancelled&plan=${planId}`,
      metadata: {
        action: "company_registration",
        customerId: stripeCustomer.id,
        planId: planId,
        planName: selectedPlan.name
      }
    });

    res.status(200).json({
      message: `Complete ${selectedPlan.name} payment to finish registration`,
      checkoutUrl: session.url,
      sessionId: session.id,
      selectedPlan: {
        id: selectedPlan.id,
        name: selectedPlan.name,
        description: selectedPlan.description
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "Something went wrong" });
  }
};

// ============================================
// COMPLÉTER L'INSCRIPTION APRÈS PAIEMENT
// ============================================

const completeRegistration = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: "Session ID required" });
    }

    // Récupérer la session Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Vérifier que le paiement est réussi
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ 
        message: "Payment not completed",
        paymentStatus: session.payment_status
      });
    }

    // Récupérer les données du customer
    const customer = await stripe.customers.retrieve(session.customer);
    
    if (!customer.metadata.pendingData) {
      return res.status(400).json({ message: "Registration data not found" });
    }

    const userData = JSON.parse(customer.metadata.pendingData);
    const selectedPlan = PAYMENT_PLANS[userData.planId];

    if (!selectedPlan) {
      return res.status(400).json({ message: "Invalid plan information" });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // ✅ CRÉER L'UTILISATEUR AVEC INFO DU PLAN
    const newUser = new User({
      username: userData.username,
      email: userData.email,
      password: userData.password,
      role: "company",
      stripeCustomerId: customer.id,
      companyInfo: {
        location: userData.location,
        category: userData.category,
        founded: userData.founded,
        size: userData.size,
        website: userData.website,
        linkedin: userData.linkedin,
        coordinates: userData.coordinates
      },
      isActive: true,
      subscriptionId: session.subscription,
      planInfo: {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        priceId: selectedPlan.priceId
      },
      paymentInfo: {
        sessionId: session.id,
        paidAt: new Date(),
        amount: session.amount_total,
        currency: session.currency
      }
    });

    await newUser.save();

    // Nettoyer les métadonnées temporaires et ajouter info utilisateur
    await stripe.customers.update(customer.id, {
      metadata: {
        role: "company",
        userId: newUser._id.toString(),
        activePlan: selectedPlan.id
      }
    });

    // Générer JWT token pour connexion automatique
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(201).json({
      message: `Company registered successfully with ${selectedPlan.name}`,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
        plan: {
          id: selectedPlan.id,
          name: selectedPlan.name
        }
      },
      token
    });

  } catch (error) {
    console.error('Error completing registration:', error);
    res.status(500).json({ message: error.message || "Something went wrong" });
  }
};

// ============================================
// VÉRIFIER STATUT DE PAIEMENT (Amélioré)
// ============================================

const checkPaymentStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const planId = session.metadata?.planId;
    const selectedPlan = planId ? PAYMENT_PLANS[planId] : null;
    
    res.status(200).json({
      sessionId: session.id,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email,
      amountTotal: session.amount_total,
      currency: session.currency,
      isCompleted: session.payment_status === 'paid',
      plan: selectedPlan ? {
        id: selectedPlan.id,
        name: selectedPlan.name
      } : null
    });
    
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// GET CURRENT USER AMÉLIORÉ AVEC INFO PLAN
// ============================================
const checkSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.params.userId; // ou tu peux utiliser req.user.id si JWT
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const paidAt = user.paymentInfo?.paidAt;
    if (!paidAt) {
      return res.status(200).json({ 
        subscriptionStatus: "inactive", 
        timeLeft: 0 
      });
    }

    const expirationDate = new Date(new Date(paidAt).getTime() + 30*24*60*60*1000);
    const now = new Date();
    const diff = expirationDate - now;

    const timeLeft = diff > 0 ? diff : 0;
    const status = diff > 0 ? "active" : "expired";

    res.status(200).json({
      subscriptionStatus: status,
      timeLeftMs: timeLeft,
      expirationDate
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("username image_User email role isActive companyInfo planInfo");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // ✅ Pour les companies, ajouter info sur l'abonnement et le plan
        if (user.role === 'company' && user.stripeCustomerId) {
          try {
            const subscriptions = await stripe.subscriptions.list({
              customer: user.stripeCustomerId,
              limit: 1
            });

            const subscriptionStatus = subscriptions.data.length > 0 ? 
              subscriptions.data[0].status : 'none';

            user._doc.subscriptionStatus = subscriptionStatus;

            // Ajouter des détails sur le plan actuel
            if (user.planInfo && PAYMENT_PLANS[user.planInfo.planId]) {
              user._doc.currentPlan = PAYMENT_PLANS[user.planInfo.planId];
            }

          } catch (error) {
            console.error('Error fetching subscription status:', error);
          }
        }

        res.status(200).json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Something went wrong" });
    }
};

// ============================================
// NETTOYER LES DONNÉES EXPIRÉES
// ============================================

const cleanupExpiredSessions = async (req, res) => {
  try {
    // ✅ Optionnel: Vérifier si c'est un admin
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    const customers = await stripe.customers.list({
      limit: 100,
      expand: ['data']
    });

    let cleanedCount = 0;

    for (const customer of customers.data) {
      if (customer.metadata.pendingData) {
        const sessions = await stripe.checkout.sessions.list({
          customer: customer.id,
          limit: 1
        });

        if (sessions.data.length > 0) {
          const session = sessions.data[0];
          const sessionDate = new Date(session.created * 1000);
          const now = new Date();
          const diffHours = (now - sessionDate) / (1000 * 60 * 60);

          if (diffHours > 24 && session.payment_status !== 'paid') {
            await stripe.customers.del(customer.id);
            cleanedCount++;
            console.log(`Cleaned up expired customer: ${customer.email}`);
          }
        }
      }
    }

    res.status(200).json({
      message: `Cleaned up ${cleanedCount} expired sessions`,
      cleanedCount
    });

  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// MIDDLEWARE POUR VÉRIFIER ABONNEMENT ACTIF
// ============================================

const checkActiveSubscription = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role === 'company' && user.stripeCustomerId) {
      // Vérifier le statut de l'abonnement
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'active',
        limit: 1
      });

      if (subscriptions.data.length === 0) {
        // Désactiver l'utilisateur en DB
        await User.findByIdAndUpdate(user.id, { isActive: false });
        
        return res.status(403).json({ 
          message: "Subscription required. Please renew your plan." 
        });
      }
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Error checking subscription status" });
  }
};

// ============================================
// LOGIN AMÉLIORÉ
// ============================================

const login = async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body;

    // ✅ Vérification reCAPTCHA
    await verifyCaptchaToken(captchaToken);

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: `User with email ${email} not found` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: `Invalid credentials` });
    }

    // ✅ Vérifier si l'utilisateur company est actif
    if (user.role === 'company' && !user.isActive) {
      return res.status(403).json({ 
        message: "Account inactive. Please complete payment or contact support." 
      });
    }

    // ✅ Si company avec Stripe, vérifier l'abonnement
    if (user.role === 'company' && user.stripeCustomerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: 'active',
          limit: 1
        });

        if (subscriptions.data.length === 0) {
          user.isActive = false;
          await user.save();
          return res.status(403).json({ 
            message: "Subscription expired. Please renew your plan." 
          });
        }
      } catch (stripeError) {
        console.error('Error checking Stripe subscription:', stripeError);
        // Continuer la connexion si erreur Stripe temporaire
      }
    }

    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();
    
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({ 
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        plan: user.planInfo ? {
          id: user.planInfo.planId,
          name: user.planInfo.planName
        } : null
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "Something went wrong" });
  }
};

// ============================================
// FONCTIONS EXISTANTES (inchangées)
// ============================================

const forgotPassword = async (req, res) => {
  try {
    const { email , captchaToken } = req.body;

   // ✅ Vérification reCAPTCHA
    await verifyCaptchaToken(captchaToken);

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found with this email" });

    // Générer le code à 6 chiffres
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Hasher le code avant de sauvegarder
    const resetCodeHash = crypto.createHash("sha256").update(resetCode).digest("hex");

    // Sauvegarder le code + date d'expiration
    user.resetPasswordToken = resetCodeHash;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // Logo depuis le dossier assets
    const logoPath = path.join(__dirname, "..", "assets", "namelogo.png");

    // Configurer nodemailer
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Envoyer l'email HTML professionnel
    await transporter.sendMail({
      from: `"Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Code",
      attachments: [
        {
          filename: "namelogo.png",
          path: logoPath,
          cid: "logo",
        },
      ],
      html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          
          <!-- Header with Logo -->
          <div style="background-color: #28a7465b; padding: 30px; text-align: center;">
            <img src="cid:logo" alt="Logo" style="height: 200px; width: auto;"/>
          </div>

          <!-- Main Content -->
          <div style="padding: 40px; text-align: center;">
            <h1 style="color: #28a745; font-size: 28px; margin-bottom: 20px;">Password Reset Request</h1>
            <p style="color: #555; font-size: 16px;">We received a request to reset your password. Use the code below to proceed.</p>
            
            <div style="margin: 30px 0; font-size: 32px; font-weight: bold; color: #28a745; letter-spacing: 4px;">
              ${resetCode}
            </div>

            <p style="color: #555; font-size: 14px;">This code will expire in <strong>15 minutes</strong>.</p>

            <a href="#" style="display: inline-block; margin-top: 25px; background: linear-gradient(90deg, #28a745, #218838); color: white; text-decoration: none; font-weight: bold; padding: 15px 35px; border-radius: 8px; transition: all 0.3s;">Reset Password</a>
          </div>

          <!-- Footer -->
          <div style="background-color: #f1f1f1; padding: 20px; text-align: center; font-size: 12px; color: #777;">
            <p>If you did not request a password reset, please ignore this email.</p>
            <p>&copy; ${new Date().getFullYear()} MatchGo. All rights reserved.</p>
          </div>

        </div>
      </div>
      `,
    });

    res.status(200).json({ message: "Reset code sent to email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const verifyCode = async (req, res) => {
  try {
    const { email, code , captchaToken  } = req.body;
    
    // ✅ Verify reCAPTCHA first
    await verifyCaptchaToken(captchaToken);
    
    const resetCodeHash = crypto.createHash("sha256").update(code).digest("hex");

    const user = await User.findOne({
      email,
      resetPasswordToken: resetCodeHash,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired code" });

    res.status(200).json({ message: "Code verified" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword, captchaToken } = req.body;
 
    // ✅ Verify reCAPTCHA first
    await verifyCaptchaToken(captchaToken);
    
    // Hash the code
    const resetCodeHash = crypto.createHash("sha256").update(code).digest("hex");

    const user = await User.findOne({
      email,
      resetPasswordToken: resetCodeHash,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired code" });

    // Hash and save new password
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
};


// ============================================
// MIGRER ANCIENNES COMPANIES POUR PAIEMENT
// ============================================
const migrateOldCompanyToStripe = async (req, res) => {
  try {
    const { email, planId } = req.body;

    if (!email || !planId || !PAYMENT_PLANS[planId]) {
      return res.status(400).json({ 
        message: "Email and valid planId required",
        availablePlans: Object.keys(PAYMENT_PLANS)
      });
    }

    // Chercher la company existante
    const company = await User.findOne({ email, role: "company" });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    if (company.stripeCustomerId) {
      return res.status(400).json({ message: "Company already has Stripe customer" });
    }

    const selectedPlan = PAYMENT_PLANS[planId];

    // Créer le customer Stripe avec toutes les infos nécessaires
    const stripeCustomer = await stripe.customers.create({
      email: company.email,
      name: company.username,
      metadata: {
        role: "company",
        pendingData: JSON.stringify({
          username: company.username,
          email: company.email,
          password: company.password, // doit être hashé
          location: company.companyInfo?.location || null,
          category: company.companyInfo?.category || null,
          founded: company.companyInfo?.founded || null,
          size: company.companyInfo?.size || null,
          website: company.companyInfo?.website || null,
          linkedin: company.companyInfo?.linkedin || null,
          coordinates: company.companyInfo?.coordinates || null,
          planId: planId
        })
      }
    });

    // Créer session Stripe pour abonnement
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer: stripeCustomer.id,
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: 1
        }
      ],
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/dashboard?error=payment_cancelled`,
      metadata: {
        action: "migrate_old_company",
        customerId: stripeCustomer.id,
        planId: planId
      }
    });

    // Mettre à jour l'entreprise avec le Stripe Customer ID et plan temporaire
    company.stripeCustomerId = stripeCustomer.id;
    company.planInfo = {
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      priceId: selectedPlan.priceId
    };
    await company.save();

    res.status(200).json({
      message: `Company migrated to Stripe. Complete payment to activate subscription.`,
      checkoutUrl: session.url,
      sessionId: session.id,
      selectedPlan: {
        id: selectedPlan.id,
        name: selectedPlan.name
      }
    });

  } catch (error) {
    console.error("Error migrating company:", error);
    res.status(500).json({ message: error.message || "Something went wrong" });
  }
};


const completeRegistrationForExistingCompany = async (sessionId) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== 'paid') throw new Error("Payment not completed");

  const customer = await stripe.customers.retrieve(session.customer);
  const pendingData = JSON.parse(customer.metadata.pendingData);

  // Trouver l'utilisateur existant
  const company = await User.findOne({ email: pendingData.email });
  if (!company) throw new Error("Company not found");

  // Mettre à jour le plan et activer le compte
  company.stripeCustomerId = customer.id;
  company.planInfo = {
    planId: pendingData.planId,
    planName: pendingData.planId === "pro" ? "Pro Plan" : "Lite Plan",
    priceId: pendingData.planId === "pro" ? "price_..." : "price_..."
  };
  company.isActive = true;
  company.subscriptionId = session.subscription;
  await company.save();

  return company;
};

const deleteStripeAccount = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.stripeCustomerId) {
      return res.status(400).json({ message: "User does not have a Stripe account" });
    }

    // Delete Stripe customer
    const deletedCustomer = await stripe.customers.del(user.stripeCustomerId);

    // Optional: remove stripe info from DB
    user.stripeCustomerId = undefined;
    user.subscriptionId = undefined;
    user.planInfo = undefined;
    user.isActive = false;
    await user.save();

    res.status(200).json({
      message: "Stripe account deleted successfully",
      deletedCustomer
    });
  } catch (error) {
    console.error("Error deleting Stripe account:", error);
    res.status(500).json({ message: error.message || "Something went wrong" });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  verifyCode,
  cleanupExpiredSessions,
  checkActiveSubscription,
  checkPaymentStatus,
  completeRegistration,
  getPlans ,
  migrateOldCompanyToStripe,
  deleteStripeAccount,
  completeRegistrationForExistingCompany,
  upgradePlanWithoutProtect,
  checkSubscriptionStatus
};