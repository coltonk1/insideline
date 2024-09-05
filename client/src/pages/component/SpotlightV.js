import UserProfile from "./UserDisplay";

function Display({ post_uuid, author_uuid, img_url, title, likes, comments, description }) {
    return (
        <div
            className="displayItemS"
            onClick={() => {
                setTimeout(() => {
                    window.location.href = "/spotlightInfo?uuid=" + post_uuid;
                }, 100);
            }}
        >
            <div className="imgContainer">
                <img src={img_url} alt="Main content"></img>
            </div>
            <div className="infoContainer">
                <h1>{title}</h1>
                <p>{description}</p>
                <div className="user-bottom-stats">
                    <UserProfile uuid={author_uuid} />
                    <div className="infoBottom">
                        <div className="stats">
                            <div className="likes">
                                <img
                                    src="https://icons.veryicon.com/png/o/miscellaneous/ui-basic-linear-icon/like-106.png"
                                    alt="Likes"
                                ></img>
                                <p>{likes}</p>
                            </div>
                            <div className="comments">
                                <img src="https://www.svgrepo.com/download/332297/comment.svg" alt="Views"></img>
                                <p>{comments}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Display;
