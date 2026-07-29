import { CATEGORY_RULES } from "./categoryRules";
import { ImageCategory } from "./imageCategories";

export interface CategorizedImage {

    category: ImageCategory;

    confidence: number;

}

export function categorizeImage(

    fileName: string

): CategorizedImage {

    const lower =

        fileName.toLowerCase();

    for (const rule of CATEGORY_RULES) {

        for (const keyword of rule.keywords) {

            if (

                lower.includes(keyword)

            ) {

                return {

                    category: rule.category,

                    confidence: 95

                };

            }

        }

    }

    return {

        category: ImageCategory.UNKNOWN,

        confidence: 0

    };

}