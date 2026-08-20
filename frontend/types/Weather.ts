export type WeatherType = "sunny" | "cloudy" | "rainy" | "snowy" | "stormy" | "foggy";
export type Season = "spring" | "summer" | "autumn" | "winter";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export type WeatherContext = {
    weather: WeatherType;
    season: Season;
    time_of_day: TimeOfDay;
};

export type WeatherData = {
    city: string;
    country: string;
    temperature: number;
};