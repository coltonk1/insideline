function App() {
    import("../styles/error.css");
    return (
        <main>
            <div>
                <title>404</title>
                <div>Sorry, that page wasnt found.</div>
                <br />
                <br />
                <br />
                <br />
                <a className="lightSpecialButton" href="/home">
                    Go back home
                </a>
                <br />
                <p>
                    Is there supposed to be a page here? <a href="contact">Contact support</a>.
                </p>
            </div>
        </main>
    );
}

export default App;
