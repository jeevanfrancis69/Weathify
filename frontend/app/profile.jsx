function Header() {
    return (
        <div className="flex items-center max-w-1/2 gap-3">
            <div id="profile-pic" className="shrink-0">
                <img
                    src="https://picsum.photos/600/400"
                    alt="Test placeholder"
                    className="size-16 rounded-full object-cover"
                />
            </div>

            <div id="username">
                <h2 className="m-0">Test</h2>
            </div>
        </div>
    );
}


export default Header