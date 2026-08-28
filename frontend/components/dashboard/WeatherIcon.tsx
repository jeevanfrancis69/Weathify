type WeatherIconProps = { type: string | null}
//an object with property type that has String data type is passed down here


function WeatherIcon({ type }: WeatherIconProps) {
    switch (type) {
        case "sunny":
            return (
                <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M12 2V4M12 20V22M2 12H4M20 12H22 M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07 M4.93 19.07L6.34 17.66M17.66 6.34L19.07 4.93"
                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
            );
        case "cloudy":
            return (
                <svg viewBox="0 0 24 24" fill="none">
                    <path d="M6.5 19C4.01 19 2 16.99 2 14.5C2 12.24 3.61 10.36 5.75 10.04 C5.9 7.76 7.79 6 10.08 6C11.69 6 13.1 6.86 13.89 8.15 C14.36 8.05 14.85 8 15.35 8C18.49 8 21 10.51 21 13.65 C21 16.79 18.49 19 15.35 19H6.5Z"
                          stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
            );
        case "rainy":
            return (
                <svg viewBox="0 0 24 24" fill="none">
                    <path d="M6.5 16C4.01 16 2 13.99 2 11.5C2 9.24 3.61 7.36 5.75 7.04 C5.9 4.76 7.79 3 10.08 3C11.69 3 13.1 3.86 13.89 5.15 C14.36 5.05 14.85 5 15.35 5C18.49 5 21 7.51 21 10.65 C21 13.49 18.88 15.82 16.13 16H6.5Z"
                          stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 19V21M12 19V21M16 19V21M10 21.5V22.5M14 21.5V22.5"
                          stroke="currentColor" strokeWidth = "1.5" strokeLinecap="round"/>
                </svg>
            );
        case "snowy":
            return (
                <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 2V22M12 2L9 5M12 2L15 5M12 22L9 19M12 22L15 19"
                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12H22M2 12L5 9M2 12L5 15M22 12L19 9M22 12L19 15"
                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            );
        case "stormy":
            return (
                <svg viewBox="0 0 24 24" fill="none">
                    <path d="M13 12L10 17H14L11 22"
                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 16C3.79 16 2 14.21 2 12C2 9.79 3.79 8 6 8H6.27 C6.64 5.72 8.62 4 11 4C13.38 4 15.36 5.72 15.73 8H16 C18.21 8 20 9.79 20 12C20 14.21 18.21 16 16 16"
                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
            );
        case "foggy":
            return (
                <svg viewBox="0 0 24 24" fill="none">
                    <path d="M3 12H21M3 8H21M3 16H17"
                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
            );
        default:
            return null
    }
}


export default WeatherIcon;