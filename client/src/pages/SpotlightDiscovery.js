import UserProfile from "./component/UserDisplay";
import { useState, useEffect } from "react";
import SpotlightV from "./component/SpotlightV";

const showerURL =
    "https://www.mydomaine.com/thmb/pxx02mRnUbasWHLGtg9U_9r-TZM=/2000x0/filters:no_upscale():strip_icc()/brophyinteriors.com-3dec9a32a5294eeca14ed2e92381e265.jpg";

function DisplayContainer(props) {
    return <div className="displayContainer">{props.children}</div>;
}

function Display(props) {
    return (
        <div
            className="displayItemS"
            onClick={() => {
                setTimeout(() => {
                    window.location.href = "/spotlightInfo?uuid=" + props.post_uuid;
                }, 100);
            }}
        >
            <div className="imgContainer">
                <img src={props.image_url} alt="Main content"></img>
            </div>
            <div className="infoContainer">
                <h1>{props.title}</h1>
                <p>{props.description}</p>
                <div className="infoBottom">
                    <UserProfile uuid={props.author_uuid} />
                    <div className="stats">
                        <div className="likes">
                            <img src="https://icons.veryicon.com/png/o/miscellaneous/ui-basic-linear-icon/like-106.png" alt="Likes"></img>
                            <p>{props.likes}</p>
                        </div>
                        <div className="comments">
                            <img src="https://www.svgrepo.com/download/332297/comment.svg" alt="Views"></img>
                            <p>{props.comments}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ShowerSearch() {
    return (
        <section id="main">
            <img src={showerURL} alt="Looking for your new home?" />
            <title>Trying to find inspiration? Search now</title>
        </section>
    );
}

function ShowerRecommentdations() {
    return (
        <section id="recommendations">
            <div>
                <title>Don't know what you're looking for?</title>
                <p>Here are some more! {localStorage.getItem("token") ? "" : "Log in to get a personalized discovery"}</p>
            </div>
            <a className="lightSpecialButton" href="/designDiscovery" tabIndex={0}>
                View More
            </a>
        </section>
    );
}

async function getPopularPosts() {
    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/getMostLiked", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(errorData.message || "Network response was not ok");
        }

        return await response.json();
    } catch (error) {
        console.error("Error:", error.message);
        return false;
    }
}

function ShowerRecent() {
    import("../styles/spotlightsEx.css");
    const [data, setData] = useState();

    const fetchData = async () => {
        let result = await getPopularPosts();
        console.log(result);
        setData(result);
    };

    useEffect(() => {
        fetchData();
    }, []);
    return (
        <section id="recent">
            <div id="background"></div>
            <title>
                <p>Weekly</p>Favorites
            </title>
            <DisplayContainer>
                {data &&
                    data.map((element) => {
                        return (
                            <SpotlightV
                                post_uuid={element.post_uuid}
                                author_uuid={element.author_uuid}
                                img_url={element.image_urls[0]}
                                title={element.title}
                                description={element.description || ""}
                                likes={element.likes}
                                comments={element.comments}
                            />
                        );
                    })}
            </DisplayContainer>
            {/* <a className="lightSpecialButton" href="/designDiscovery" tabIndex={0}>
                Top Spotlights
            </a> */}
        </section>
    );
}

function App() {
    import("../styles/home.css");
    import("../styles/spotlights.css");

    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            window.location.href = "/designDiscovery?q=" + encodeURIComponent(event.target.value);
        }
    };

    return (
        <main>
            <div className="main-search">
                <img src="/search-icon2.png" className="right-input-image" />
                <input
                    type="text"
                    placeholder="What are you trying to find?"
                    onKeyDown={(e) => {
                        handleKeyDown(e);
                    }}
                ></input>
            </div>
            <ShowerSearch />
            <ShowerRecent />
            <ShowerRecommentdations />
        </main>
    );
}

export default App;
