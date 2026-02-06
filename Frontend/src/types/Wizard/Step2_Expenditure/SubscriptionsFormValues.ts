export interface SubscriptionItem {
    id?: string;
    name?: string;
    cost?: number | null;
}

export interface SubscriptionsSubForm {
    netflix?: number | null;
    spotify?: number | null;
    hbomax?: number | null;
    viaplay?: number | null;
    disneyPlus?: number | null;
    customSubscriptions?: (SubscriptionItem | undefined)[];
}