import React, { createContext, useContext } from 'react';

const LeftPanelSlotContext = createContext<React.ReactNode | null>(null);

export function LeftPanelSlotProvider({
  value,
  children,
}: {
  value: React.ReactNode | null;
  children: React.ReactNode;
}) {
  return (
    <LeftPanelSlotContext.Provider value={value}>
      {children}
    </LeftPanelSlotContext.Provider>
  );
}

export function useLeftPanelSlot(): React.ReactNode | null {
  return useContext(LeftPanelSlotContext);
}
