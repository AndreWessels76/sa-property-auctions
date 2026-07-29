export interface AIDuplicateDecision {

    duplicate: boolean;
  
    confidence: number;
  
    reason: string;
  
    recommendedAction:
  
      | "MERGE"
  
      | "INSERT"
  
      | "MANUAL_REVIEW";
  
  }