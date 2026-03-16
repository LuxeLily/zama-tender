import React, { ReactNode, createContext, useContext, useState } from "react";
import { GenericStringInMemoryStorage, GenericStringStorage } from "../storage/GenericStringStorage";

interface UseInMemoryStorageState {
  storage: GenericStringStorage;
}

interface InMemoryStorageProviderProps {
  children: ReactNode;
}

const GLOBAL_CONTEXT_KEY = "__FHEVM_SDK_IN_MEMORY_STORAGE_CONTEXT__";

if (typeof window !== "undefined" && !(window as any)[GLOBAL_CONTEXT_KEY]) {
  (window as any)[GLOBAL_CONTEXT_KEY] = createContext<UseInMemoryStorageState | undefined>(undefined);
}

const InMemoryStorageContext = typeof window !== "undefined"
  ? (window as any)[GLOBAL_CONTEXT_KEY]
  : createContext<UseInMemoryStorageState | undefined>(undefined);

export const useInMemoryStorage = () => {
  const context = useContext(InMemoryStorageContext);
  console.log("[useInMemoryStorage] context:", context ? "exists" : "MISSING");
  if (!context) {
    throw new Error("useInMemoryStorage must be used within a InMemoryStorageProvider");
  }
  return context;
};

export const InMemoryStorageProvider: React.FC<InMemoryStorageProviderProps> = ({ children }) => {
  const [storage] = useState<GenericStringStorage>(new GenericStringInMemoryStorage());
  console.log("!!! PIZZA !!! [InMemoryStorageProvider] Rendering provider...");
  return <InMemoryStorageContext.Provider value={{ storage }}>{children}</InMemoryStorageContext.Provider>;
};
