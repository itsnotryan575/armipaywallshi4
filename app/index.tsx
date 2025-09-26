import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { DevNoteModal } from '@/components/DevNoteModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InitialListSelectionModal } from '@/components/InitialListSelectionModal';

export default function Index() {
  const { user, loading } = useAuth();
  const { isDark } = useTheme();
  
  // Modal states
  const [showDevNoteModal, setShowDevNoteModal] = useState(false);
  const [showListSelectionModal, setShowListSelectionModal] = useState(false);
  const [isInitialModalCheckLoading, setIsInitialModalCheckLoading] = useState(true);

  console.log('Index - User:', user?.email, 'Confirmed:', user?.email_confirmed_at, 'Loading:', loading);

  const theme = {
    text: '#f0f0f0',
    background: isDark ? '#0B0909' : '#003C24',
    primary: isDark ? '#8C8C8C' : '#f0f0f0',
  };

  // Determine which modals to show based on user state
  useEffect(() => {
    if (!loading && user?.email_confirmed_at) {
      console.log('🔍 DEBUG: User is authenticated and confirmed, determining modal flow');
      determineAndShowInitialModals();
    } else {
      // User is not confirmed or still loading, clear modal states
      setShowDevNoteModal(false);
      setShowListSelectionModal(false);
      setIsInitialModalCheckLoading(false);
    }
  }, [loading, user?.email_confirmed_at, user?.isPro, user?.selectedListType]);

  const determineAndShowInitialModals = async () => {
    try {
      setIsInitialModalCheckLoading(true);
      console.log('🔍 DEBUG: Determining which modals to show...');
      
      // Check AsyncStorage flags
      const hasMadeInitialListSelection = await AsyncStorage.getItem('has_made_initial_list_selection');
      const dontShowDevNote = await AsyncStorage.getItem('do_not_show_dev_note_again');
      
      console.log('🔍 DEBUG: AsyncStorage flags:', {
        hasMadeInitialListSelection,
        dontShowDevNote,
        userIsPro: user?.isPro,
        userSelectedListType: user?.selectedListType
      });
      
      // Determine if list selection modal should show
      // Show for free users who haven't selected a list AND haven't made initial selection
      const shouldShowListSelection = !user?.isPro && 
                                     !user?.selectedListType && 
                                     hasMadeInitialListSelection !== 'true';
      
      // Determine if dev note modal should show
      // Show if user hasn't opted out AND hasn't made initial list selection (or is pro)
      const shouldShowDevNote = dontShowDevNote !== 'true';
      
      console.log('🔍 DEBUG: Modal decisions:', {
        shouldShowListSelection,
        shouldShowDevNote
      });
      
      if (shouldShowListSelection) {
        // List selection takes priority - show it first
        console.log('🔍 DEBUG: Showing list selection modal');
        setShowListSelectionModal(true);
        setShowDevNoteModal(false);
      } else if (shouldShowDevNote) {
        // Show dev note if list selection isn't needed
        console.log('🔍 DEBUG: Showing dev note modal');
        setShowDevNoteModal(true);
        setShowListSelectionModal(false);
      } else {
        // No modals needed
        console.log('🔍 DEBUG: No modals needed, proceeding to main app');
        setShowDevNoteModal(false);
        setShowListSelectionModal(false);
      }
    } catch (error) {
      console.error('Error determining modal flow:', error);
      // On error, don't show any modals
      setShowDevNoteModal(false);
      setShowListSelectionModal(false);
    } finally {
      setIsInitialModalCheckLoading(false);
    }
  };

  const handleListSelectionClose = async () => {
    console.log('🔍 DEBUG: List selection modal closed');
    try {
      // Mark that user has made their initial list selection
      await AsyncStorage.setItem('has_made_initial_list_selection', 'true');
      setShowListSelectionModal(false);
      
      // After list selection, check if dev note should be shown
      const dontShowDevNote = await AsyncStorage.getItem('do_not_show_dev_note_again');
      if (dontShowDevNote !== 'true') {
        console.log('🔍 DEBUG: Showing dev note after list selection');
        setShowDevNoteModal(true);
      } else {
        console.log('🔍 DEBUG: User opted out of dev note, proceeding to main app');
      }
    } catch (error) {
      console.error('Error handling list selection close:', error);
    }
  };

  const handleDevNoteClose = async (dontShowAgain: boolean) => {
    console.log('🔍 DEBUG: Dev note closing, dontShowAgain:', dontShowAgain);
    try {
      if (dontShowAgain) {
        console.log('🔍 DEBUG: Setting do_not_show_dev_note_again to true');
        await AsyncStorage.setItem('do_not_show_dev_note_again', 'true');
      }
      setShowDevNoteModal(false);
      console.log('🔍 DEBUG: Dev note closed');
    } catch (error) {
      console.error('Error saving dev note preference:', error);
      setShowDevNoteModal(false);
    }
  };

  // Show loading while checking modal states
  if (loading || isInitialModalCheckLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Loading ARMi...
        </Text>
      </View>
    );
  }

  // Handle unauthenticated users
  if (!user) {
    return <Redirect href="/auth/sign-in" />;
  }

  // Handle unverified users
  if (!user.email_confirmed_at) {
    return <Redirect href="/auth/verify-email" />;
  }

  // Show list selection modal first (for free users who haven't selected)
  if (showListSelectionModal) {
    console.log('🔍 DEBUG: Rendering list selection modal');
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <InitialListSelectionModal
          visible={showListSelectionModal}
          onClose={handleListSelectionClose}
          theme={theme}
        />
      </View>
    );
  }

  // Show dev note modal second (if user hasn't opted out)
  if (showDevNoteModal) {
    console.log('🔍 DEBUG: Rendering dev note modal');
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <DevNoteModal
          visible={showDevNoteModal}
          onClose={handleDevNoteClose}
        />
      </View>
    );
  }

  // All modals handled, redirect to main app
  console.log('🔍 DEBUG: All modals handled, redirecting to main app');
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
  },
});