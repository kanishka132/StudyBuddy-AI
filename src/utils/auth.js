import { supabase } from '../config/supabase.js';

export class AuthManager {
  constructor() {
    this.currentUser = null;
    this.authStateCallbacks = [];
    
    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      this.currentUser = session?.user || null;
      this.authStateCallbacks.forEach(callback => callback(this.currentUser));
    });
  }

  // Register new user
  async signUp(email, password) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      
      // Check if email confirmation is needed
      const needsEmailConfirmation = !data.session;
      
      return { 
        success: true, 
        user: data.user,
        needsEmailConfirmation
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Sign in existing user
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Sign out user
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.currentUser !== null;
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Add auth state change callback
  onAuthStateChange(callback) {
    this.authStateCallbacks.push(callback);
  }
}