import React, { createContext, useContext } from 'react';

const ColumnStretchContext = createContext<boolean>(false);

export function ColumnStretchProvider({ value, children }: { value: boolean; children: React.ReactNode }) {
  return (
    <ColumnStretchContext.Provider value={value}>
      {children}
    </ColumnStretchContext.Provider>
  );
}

export function useColumnStretch() {
  return useContext(ColumnStretchContext);
}
