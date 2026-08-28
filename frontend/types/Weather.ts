export type WeatherType = "sunny" | "cloudy" | "rainy" | "snowy" | "stormy" | "foggy";
export type Season = "spring" | "summer" | "autumn" | "winter";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export type WeatherContext = {
    weather: WeatherType | null;
    season: Season | null;
    time_of_day: TimeOfDay | null;
};

export type WeatherData = {
    city: string;
    country: string;
    temperature: number;
};