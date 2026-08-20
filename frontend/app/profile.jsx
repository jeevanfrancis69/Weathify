 function Header() {
    return (
        <div className="flex items-center gap-20 bg-neutral-900/60 backdrop-blur-sm border border-white/10 rounded-3xl px-8 py-6 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-shadow duration-300 hover:shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
            <div id="profile-pic">
                <img
                    src="https://picsum.photos/600/400"
                    alt="Test placeholder"
                    className="w-40 h-40 object-cover rounded-2xl ring-1 ring-white/15 transition-transform duration-300 ease-out hover:scale-110"
                />
            </div>

            <div id="username">
                <h2 className="text-amber-100 text-4xl font-semibold tracking-wide transition-transform duration-1000 ease-out hover:scale-125 inline-block">
                    Username
                </h2>
            </div>
        </div>
    );
}

export default Header