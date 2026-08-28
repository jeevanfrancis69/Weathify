import { motion } from "framer-motion";


function SpinnerSVG() {
    return (
        <svg width="40" height="40" viewBox="0 0 40 40">
            <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="80"
                strokeDashoffset="60"
            />
        </svg>
    );
}


export default function LoadingSpinner() {
    return (
        <motion.div
            initial = {{scale: 0}}
            animate ={ {scale:1, rotate: 360}}
            transition={{
                scale: { duration: 0.3, ease: "backOut" },
                rotate: { duration: 1, repeat: Infinity, ease: "linear" },
            }}
        >
            <SpinnerSVG/>
        </motion.div>
    )
}