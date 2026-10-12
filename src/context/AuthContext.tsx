import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, BusinessEntity } from '../types/dairy';
import {
  initializeStorageIfNeeded,
  getAllUsers,
  getEntities,
  getEntityById,
  saveEntity,
  setStored,
  STORAGE_KEYS,
} from '../services/storage';
import {
  subscribeToUsers,
  subscribeToEntities,
} from '../services/firestoreSync';

interface AuthContextType {
  currentUser: User | null;
  currentEntity: BusinessEntity | null;
  isLoading: boolean;
  login: (identifier: string, pass: string) => { success: boolean; error?: string };
  logout: () => void;
  updateCurrentEntity: (updatedEntity: BusinessEntity) => void;
  switchEntity: (entityId: string) => void;
  isOwner: boolean;
  isAdminOrOwner: boolean;
  canManageUsers: boolean;
  canEditMasters: boolean;
  canPostPurchases: boolean;
  canViewReports: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'df_auth_session_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentEntity, setCurrentEntity] = useState<BusinessEntity | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    initializeStorageIfNeeded();
    // Restore session
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const session = JSON.parse(stored);
        const users = getAllUsers();
        const foundUser = users.find((u) => u.id === session.userId && u.isActive);
        if (foundUser) {
          setCurrentUser(foundUser);
          const entity = getEntityById(foundUser.entityId);
          setCurrentEntity(entity || null);
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    } catch (e) {
      console.error('Session restore error:', e);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }

    // Sync users and entities with Firestore in real-time
    const unsubUsers = subscribeToUsers((cloudUsers) => {
      if (cloudUsers && cloudUsers.length > 0) {
        setStored(STORAGE_KEYS.USERS, cloudUsers);
        setCurrentUser((prev) => {
          if (!prev) return null;
          const matched = cloudUsers.find((u) => u.id === prev.id);
          return matched || prev;
        });
      }
    });

    const unsubEntities = subscribeToEntities((cloudEntities) => {
      if (cloudEntities && cloudEntities.length > 0) {
        setStored(STORAGE_KEYS.ENTITIES, cloudEntities);
        setCurrentEntity((prev) => {
          if (!prev) return null;
          const matched = cloudEntities.find((e) => e.id === prev.id);
          return matched || prev;
        });
      }
    });

    return () => {
      unsubUsers();
      unsubEntities();
    };
  }, []);

  const login = (identifier: string, pass: string): { success: boolean; error?: string } => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, error: 'Please enter both username/email and password.' };
    }

    const users = getAllUsers();
    const user = users.find(
      (u) =>
        (u.email.toLowerCase() === cleanId || u.username.toLowerCase() === cleanId) &&
        u.password === cleanPass
    );

    if (!user) {
      return { success: false, error: 'Invalid username/email or password.' };
    }

    if (!user.isActive) {
      return { success: false, error: 'Your account has been deactivated. Please contact the owner.' };
    }

    const entity = getEntityById(user.entityId);
    if (!entity) {
      return { success: false, error: 'Assigned business entity not found.' };
    }

    setCurrentUser(user);
    setCurrentEntity(entity);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ userId: user.id, entityId: user.entityId }));

    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentEntity(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const updateCurrentEntity = (updatedEntity: BusinessEntity) => {
    saveEntity(updatedEntity);
    setCurrentEntity(updatedEntity);
  };

  const switchEntity = (entityId: string) => {
    const targetEntity = getEntityById(entityId);
    if (targetEntity) {
      setCurrentEntity(targetEntity);
      if (currentUser) {
        const updatedUser = { ...currentUser, entityId };
        setCurrentUser(updatedUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ userId: updatedUser.id, entityId }));
      }
    }
  };

  const isOwner = currentUser?.role === 'OWNER';
  const isAdminOrOwner = currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN';
  const canManageUsers = isOwner;
  const canEditMasters = isAdminOrOwner;
  const canPostPurchases = true; // Owner, Admin, Operator can enter purchases per spec
  const canViewReports = true;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentEntity,
        isLoading,
        login,
        logout,
        updateCurrentEntity,
        switchEntity,
        isOwner,
        isAdminOrOwner,
        canManageUsers,
        canEditMasters,
        canPostPurchases,
        canViewReports,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
