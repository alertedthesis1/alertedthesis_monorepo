import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MaintenanceContextType {
  showMaintenance: (type?: 'maintenance' | 'error' | 'loading', message?: string) => void;
  hideMaintenance: () => void;
  isMaintenanceMode: boolean;
  maintenanceState: {
    show: boolean;
    type: 'maintenance' | 'error' | 'loading';
    message?: string;
  };
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const [maintenanceState, setMaintenanceState] = useState<{
    show: boolean;
    type: 'maintenance' | 'error' | 'loading';
    message?: string;
  }>({ show: false, type: 'maintenance' });

  const showMaintenance = (type: 'maintenance' | 'error' | 'loading' = 'maintenance', message?: string) => {
    setMaintenanceState({ show: true, type, message });
  };

  const hideMaintenance = () => {
    setMaintenanceState({ show: false, type: 'maintenance' });
  };

  return (
    <MaintenanceContext.Provider value={{ showMaintenance, hideMaintenance, isMaintenanceMode: maintenanceState.show, maintenanceState }}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  const context = useContext(MaintenanceContext);
  if (context === undefined) {
    throw new Error('useMaintenance must be used within a MaintenanceProvider');
  }
  return context;
}
