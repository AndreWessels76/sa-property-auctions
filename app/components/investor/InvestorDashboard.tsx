import ValueCard from "./ValueCard";
import OpportunityCard from "./OpportunityCard";
import InvestmentCard from "./InvestmentCard";
import RiskCard from "./RiskCard";
import ComparableSalesCard from "./ComparableSalesCard";
import RecommendationCard from "./RecommendationCard";

export default function InvestorDashboard({

    property

}:any){

    return(

        <div className="grid gap-6 lg:grid-cols-2">

            <ValueCard

                value={property.estimated_market_value}

                confidence={property.valuation_confidence}

            />

            <OpportunityCard

                score={property.opportunity_score}

                rating={property.opportunity_rating}

            />

            <InvestmentCard

                investmentScore={property.investment_score}

            />

            <RiskCard

                legal={property.legal_risk}

                repair={property.repair_risk}

                finance={property.finance_risk}

                market={property.market_risk}

            />

            <ComparableSalesCard

                comparableCount={property.comparable_count ?? 0}

            />

            <RecommendationCard

                recommendation={property.ai_recommendation ?? "Analyse complete."}

            />

        </div>

    );

}