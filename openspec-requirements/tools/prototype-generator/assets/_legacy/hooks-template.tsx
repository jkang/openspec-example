use client";

import { createContext, useContext, useState, ReactNode } from "react";

// Persona 类型定义
interface Persona {
  id: string;
  name: string;
  role: string;
  avatar: string;
  description: string;
  goals: string[];
  painPoints: string[];
  skillLevel: "初级" | "中级" | "高级";
  weeklyTime: string;
  preferredContent: string[];
  dataProfile: {
    typicalValues: Record<string, any>;
    frequency: "高频" | "中频" | "低频";
    typicalErrors: string[];
  };
}

// 场景状态类型
interface ScenarioState {
  currentScenario: string | null;
  currentPath: string;
  pathHistory: string[];
  stepIndex: number;
}

// Context 类型
interface PrototypeContextType {
  currentPersona: Persona | null;
  setCurrentPersona: (persona: Persona) => void;
  scenarioState: ScenarioState;
  setScenarioState: (state: ScenarioState | ((prev: ScenarioState) => ScenarioState)) => void;
  resetScenario: () => void;
  goToPath: (pathId: string) => void;
  goBack: () => void;
}

const PrototypeContext = createContext<PrototypeContextType | undefined>(undefined);

export function PrototypeProvider({ children }: { children: ReactNode }) {
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [scenarioState, setScenarioState] = useState<ScenarioState>({
    currentScenario: null,
    currentPath: "main",
    pathHistory: ["main"],
    stepIndex: 0
  });

  const resetScenario = () => {
    setScenarioState({
      currentScenario: null,
      currentPath: "main",
      pathHistory: ["main"],
      stepIndex: 0
    });
  };

  const goToPath = (pathId: string) => {
    setScenarioState(prev => ({
      ...prev,
      currentPath: pathId,
      pathHistory: [...prev.pathHistory, pathId],
      stepIndex: prev.stepIndex + 1
    }));
  };

  const goBack = () => {
    setScenarioState(prev => {
      if (prev.pathHistory.length <= 1) return prev;
      const newHistory = prev.pathHistory.slice(0, -1);
      return {
        ...prev,
        currentPath: newHistory[newHistory.length - 1],
        pathHistory: newHistory,
        stepIndex: Math.max(0, prev.stepIndex - 1)
      };
    });
  };

  return (
    <PrototypeContext.Provider
      value={{
        currentPersona,
        setCurrentPersona,
        scenarioState,
        setScenarioState,
        resetScenario,
        goToPath,
        goBack
      }}
    >
      {children}
    </PrototypeContext.Provider>
  );
}

export function usePrototype() {
  const context = useContext(PrototypeContext);
  if (context === undefined) {
    throw new Error("usePrototype must be used within a PrototypeProvider");
  }
  return context;
}
