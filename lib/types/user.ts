export interface UserProfile{

    id:string;

    email:string;

    firstName:string;

    lastName:string;

    avatarUrl?:string;

    role:
        |"admin"
        |"premium"
        |"free";

    subscriptionStatus:
        |"active"
        |"inactive"
        |"trial";

    createdAt:string;

}
