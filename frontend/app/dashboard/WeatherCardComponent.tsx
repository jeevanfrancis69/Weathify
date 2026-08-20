"use client";


import type { WeatherData, WeatherContext } from "@/types/Weather";
import WeatherIcon from "@/app/dashboard/WeatherIcon";
import weatherEmoji from "@/types/WeatherEmoji";

type WeatherCardProps = {
    context: WeatherContext;
    data: WeatherData
    onManualClick: () => void;
    onRefreshClick: () => void;
};

function cap(s: string) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

export default function WeatherCard( props: WeatherCardProps ) {
    const { context, data, onManualClick, onRefreshClick } = props;
    return (
        <>
            <div className="weather-card" id="Card">
                <div className="weather-card__left">
                    <div className="weather-icon-large" id="weatherIconLarge">
                        <WeatherIcon type={context.weather}/>
                    </div>
                    <div>
                        <div className="weather-condition" id="weatherConditionText">
                            {weatherEmoji(context.weather)} {cap(context.weather)}
                        </div>
                        <div className="weather-location" id="weatherLocationText">
                            {data ? `${data.city}, ${data.country}` : "Manual selection"}
                        </div>
                    </div>
                </div>
                <div className="weather-card__right">
                    <div className="weather-temp" id="weatherTempText">
                        {data?.temperature != null
                        ? `${data.temperature}°C`
                        : '-'}
                    </div>
                    <div className="weather-context-badges" id="weatherContextBadges">
                        {[context.season, context.time_of_day].filter(Boolean).map(v => `<span class = "context-badge"> ${cap(v)}</span>>`).join('')}

                    </div>
                </div>
            </div>

            {/* Manual Override */}
            <div className="manual-bar">
                <span className="manual-bar__label">Not right?</span>
                <button className="btn btn-outline btn-sm" onClick={onManualClick}>Set weather manually</button>
                <button className="btn btn-outline btn-sm" onClick={onRefreshClick}> ↻ Refresh</button>

            </div>

        </>
    );
}