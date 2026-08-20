
export default function weatherEmoji ( weatherName:string) {
    switch (weatherName) {
        case "sunny":
            return '☀️'
        case "cloudy":
            return '☁️'
        case "rainy":
            return '🌧️'
        case "snowy":
            return '❄️'
        case "stormy":
            return '⛈️'
        case "foggy":
            return '🌫️'
        default:
            return null
    }
}

