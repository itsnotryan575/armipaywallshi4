import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthService } from '@/services/AuthService';
import { ArmiList } from '@/types/armi-intents';

interface User {
  id: string;
  email: string;
  email_confirmed_at?: string;
  created_at: string;
  isPro: boolean;
  selectedListType: ArmiList | null;
  isProForLife: boolean;
  hasRevenueCatEntitlement: boolean;
}

interface AuthContextType {
  user: User | null;
  session: any;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  sendEmailOtp: (email: string) => Promise<any>;
  verifyEmailOtp: (email: string, token: string) => Promise<any>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateEmail: (newEmail: string) => Promise<void>;
  updateSelectedListType: (listType: ArmiList) => Promise<void>;
  checkProStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      await AuthService.init();
      
      // Get initial session
      const initialSession = await AuthService.getSession();
      setSession(initialSession);
      setUser(initialSession?.user || null);

      // Listen for auth changes
      const { data: { subscription } } = AuthService.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event, session?.user?.email);
          console.log('User email_confirmed_at:', session?.user?.email_confirmed_at);
          
          if (session?.user) {
            // Check pro status and update user object
            const proStatus = await AuthService.checkProStatus();
            const enhancedUser = {
              ...session.user,
              isPro: proStatus.isPro,
              selectedListType: proStatus.selectedListType,
              isProForLife: proStatus.isProForLife,
              hasRevenueCatEntitlement: proStatus.hasRevenueCatEntitlement,
            };
            setUser(enhancedUser);
          } else {
            setUser(null);
          }
          
          setSession(session);
          setLoading(false);
        }
      );

      return () => {
        subscription?.unsubscribe();
      };
    } catch (error) {
      console.error('Error initializing auth:', error);
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await AuthService.signUp(email, password);
      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await AuthService.signIn(email, password);
      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const sendEmailOtp = async (email: string) => {
    try {
      const result = await AuthService.sendEmailOtp(email);
      return result;
    } catch (error) {
      throw error;
    }
  };

  const verifyEmailOtp = async (email: string, token: string) => {
    try {
      const result = await AuthService.verifyEmailOtp(email, token);
      
      // Force refresh the current session to get updated user data
      const refreshedSession = await AuthService.getSession();
      
      if (refreshedSession?.user) {
        const proStatus = await AuthService.checkProStatus();
        const enhancedUser = {
          ...refreshedSession.user,
          isPro: proStatus.isPro,
          selectedListType: proStatus.selectedListType,
          isProForLife: proStatus.isProForLife,
          hasRevenueCatEntitlement: proStatus.hasRevenueCatEntitlement,
        };
        setUser(enhancedUser);
      } else {
        setUser(null);
      }
      
      setSession(refreshedSession);
      
      return result;
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await AuthService.signOut();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await AuthService.resetPassword(email);
    } catch (error) {
      throw error;
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      await AuthService.updatePassword(newPassword);
    } catch (error) {
      throw error;
    }
  };

  const updateEmail = async (newEmail: string) => {
    try {
      await AuthService.updateEmail(newEmail);
    } catch (error) {
      throw error;
    }
  };

  const updateSelectedListType = async (listType: ArmiList) => {
    try {
      await AuthService.updateSelectedListType(listType);
      
      // Update user state
      if (user) {
        setUser({
          ...user,
          selectedListType: listType,
        });
      }
    } catch (error) {
      throw error;
    }
  };

  const checkProStatus = async () => {
    try {
      const proStatus = await AuthService.checkProStatus();
      
      if (user) {
        setUser({
          ...user,
          isPro: proStatus.isPro,
          selectedListType: proStatus.selectedListType,
          isProForLife: proStatus.isProForLife,
          hasRevenueCatEntitlement: proStatus.hasRevenueCatEntitlement,
        });
      }
    } catch (error) {
      console.error('Error checking pro status:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      sendEmailOtp,
      verifyEmailOtp,
      signOut,
      resetPassword,
      updatePassword,
      updateEmail,
      updateSelectedListType,
      checkProStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}