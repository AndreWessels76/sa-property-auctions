export function educationValueAdjustment(

    educationScore:number

){

    if(educationScore>=90)

        return 0.07;

    if(educationScore>=80)

        return 0.05;

    if(educationScore>=70)

        return 0.03;

    if(educationScore>=60)

        return 0.01;

    return 0;
}
