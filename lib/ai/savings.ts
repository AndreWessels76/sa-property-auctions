export interface SavingsResult {
    amount: number;
    percent: number;
    rating: string;
    color: string;
  }
  
  export function calculateSavings(
    estimatedValue: number,
    auctionPrice: number
  ): SavingsResult {
  
    if (
      estimatedValue <= 0 ||
      auctionPrice <= 0 ||
      auctionPrice >= estimatedValue
    ) {
      return {
        amount: 0,
        percent: 0,
        rating: "Market Price",
        color: "slate",
      };
    }
  
    const amount = estimatedValue - auctionPrice;
  
    const percent = Math.round(
      (amount / estimatedValue) * 100
    );
  
    let rating = "Fair Deal";
    let color = "blue";
  
    if (percent >= 40) {
      rating = "Exceptional";
      color = "emerald";
    } else if (percent >= 30) {
      rating = "Excellent";
      color = "green";
    } else if (percent >= 20) {
      rating = "Great";
      color = "lime";
    } else if (percent >= 10) {
      rating = "Good";
      color = "yellow";
    }
  
    return {
      amount,
      percent,
      rating,
      color,
    };
  }