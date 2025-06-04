"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
} from "@mui/material";
import { DirectionsCar as CarIcon } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";

/**
 * Login page component with authentication form
 * @returns {JSX.Element} Login page
 */
export default function LoginPage() {
  console.log("🚀 LOGIN PAGE LOADED");
  // alert("Login page loaded!"); // Uncomment this line if you still don't see console logs

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { signIn, user, loading: authLoading } = useAuth();
  console.log("🔍 LOGIN PAGE - Current user:", user, "Loading:", authLoading);
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    console.log(
      "🔄 Login page - user state:",
      user,
      "authLoading:",
      authLoading
    );
    if (user && !authLoading) {
      console.log("✅ User authenticated, redirecting to dashboard");
      router.replace("/dashboard"); // Use replace instead of push to prevent back navigation
    }
  }, [user, authLoading, router]);

  /**
   * Handle form submission for user login
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setError("");

    try {
      await signIn(email, password);
      // Don't manually redirect here - let the useEffect handle it
      // when the user state is properly updated
    } catch (error) {
      setError(getErrorMessage(error.code));
    }
  };

  /**
   * Get user-friendly error message from Firebase error code
   * @param {string} errorCode - Firebase error code
   * @returns {string} User-friendly error message
   */
  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case "auth/user-not-found":
        return "No account found with this email address";
      case "auth/wrong-password":
        return "Incorrect password";
      case "auth/invalid-email":
        return "Invalid email address";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later";
      default:
        return "Login failed. Please check your credentials and try again";
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
          }}
        >
          {/* Logo and Title */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <CarIcon sx={{ fontSize: 40, color: "primary.main", mr: 2 }} />
            <Box>
              <Typography component="h1" variant="h4" fontWeight="bold">
                Belbin Fleet Manager
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Comprehensive Fleet Management System
              </Typography>
            </Box>
          </Box>

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              "Sign In"
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" textAlign="center">
            Welcome to Belbin Travel Fleet Management System
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}
