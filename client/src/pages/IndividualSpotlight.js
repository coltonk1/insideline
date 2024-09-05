// src/Spotlight.js
import React, { useState, useEffect } from "react";
import UserProfile from "./component/UserDisplay";

async function callAPI(body) {
    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/getSpecificPostData", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Network response was not ok");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error:", error.message);
    }
}

async function addCommentCallAPI(body) {
    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/createComment", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Network response was not ok");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error:", error.message);
    }
}

async function getCommentsCallAPI(body) {
    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/getComments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Network response was not ok");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error:", error.message);
    }
}

async function isLiked(uuid) {
    const body = { post_uuid: uuid, token: localStorage.getItem("token") };
    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/userLiked", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            console.log(await response.text());
            throw new Error("Network response was not ok");
        }

        let result = await response.json();
        return result.is_liked;
    } catch (error) {
        console.error("Error:", error.message);
        return false;
    }
}

async function callLikeAPI(uuid) {
    const body = { post_uuid: uuid, token: localStorage.getItem("token") };
    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/likePost", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            console.log(await response.text());
            throw new Error("Network response was not ok");
        }

        return true;
    } catch (error) {
        console.error("Error:", error.message);
        return false;
    }
    return false;
}

async function handleRemovePost(post_uuid, user_uuid) {
    const body = {
        post_uuid: post_uuid,
        token: localStorage.getItem("token"),
    };
    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/removePost", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.log(errorData);
            throw new Error(errorData.message || "Network response was not ok");
        }

        const data = await response.text();
        window.location.href = "/profile/?uuid=" + user_uuid;
    } catch (error) {
        console.error("Error:", error.message);
    }
}

const Spotlight = () => {
    import("../styles/Spotlight.css");

    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [replyTo, setReplyTo] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);

    const [data, setData] = useState();

    const [mainImage, setMainImage] = useState("");

    const [liked, setLiked] = useState(false);

    const queryString = window.location.search;
    const queryParams = new URLSearchParams(queryString);
    const uuid = queryParams.get("uuid");
    const post_uuid = uuid;

    const fetchData = async () => {
        let result = await callAPI({ post_uuid: uuid });
        setData(result);
        let commentResult = await getCommentsCallAPI({ post_uuid: uuid });
        if (commentResult === null) commentResult = [];
        let commentArray = [];
        if (commentResult.length > 0) {
            commentResult.forEach((comment) => {
                commentArray.push({ text: comment.Text, reply_to: "", author_uuid: comment.AuthorUuid, comment_uuid: comment.CommentUuid });
            });
            setComments(commentArray);
        }
        let liked = await isLiked(uuid);
        console.log(liked);
        setLiked(liked);
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setMainImage(data && data.ImageURLs[0]);
    }, [data]);

    const handleAddComment = () => {
        const queryString = window.location.search;
        const queryParams = new URLSearchParams(queryString);
        const uuid = queryParams.get("uuid");

        if (newComment.trim() !== "") {
            const commentBody = {
                token: localStorage.getItem("token"),
                text: newComment,
                reply_to: "",
                post_uuid: uuid,
            };

            const fetchData = async () => {
                let result = await addCommentCallAPI(commentBody);
                const comment = {
                    text: newComment,
                    reply_to: "",
                    author_uuid: result.user_uuid,
                    comment_uuid: result.comment_uuid,
                };
                setComments([...comments, comment]);
            };

            setNewComment("");

            fetchData();
        }
    };

    const handleReply = (comment_uuid) => {
        const queryString = window.location.search;
        const queryParams = new URLSearchParams(queryString);
        const uuid = queryParams.get("uuid");

        if (newComment.trim() !== "") {
            const commentBody = {
                token: localStorage.getItem("token"),
                text: newComment,
                reply_to: comment_uuid,
                post_uuid: uuid,
            };

            const fetchData = async () => {
                let result = await addCommentCallAPI(commentBody);
                const comment = {
                    text: newComment,
                    reply_to: comment_uuid,
                    author_uuid: result.user_uuid,
                    comment_uuid: result.comment_uuid,
                };
                setComments([...comments, comment]);
            };

            setNewComment("");

            fetchData();
        }
    };

    const handleImageClick = (image) => {
        setSelectedImage(image);
    };

    const closeImagePreview = () => {
        setSelectedImage(null);
    };

    function checkOverflow(containerId) {
        const container = document.getElementById(containerId);

        if (!container) return false;

        // Check if the text overflows
        return container.scrollHeight > container.clientHeight;
    }

    function showModal() {
        const modal = document.getElementById("myModal");
        const modalURL = document.getElementById("modalURL");
        modalURL.href = window.location.href;
        modalURL.textContent = window.location.href;
        modal.style.display = "block";
    }

    function closeModal() {
        const modal = document.getElementById("myModal");
        modal.style.display = "none";
    }

    function copyToClipboard(e) {
        const url = window.location.href;
        navigator.clipboard
            .writeText(url)
            .then(() => {
                e.target.innerHTML = "Copied";
                setTimeout(() => {
                    e.target.innerHTML = "Copy to Clipboard";
                }, 1500);
            })
            .catch((err) => {
                console.error("Failed to copy: ", err);
            });
    }

    return (
        <div className="spotlight-container">
            <div className="spotlight">
                <div className="top-container">
                    <UserProfile uuid={data && data.AuthorUUID} />
                    {data && data.AuthorUUID === localStorage.getItem("uuid") ? (
                        <div className="edit-post-container">
                            <a className="edit-post" href={"/createPost?uuid=" + uuid}>
                                Edit
                            </a>
                            <a
                                className="remove-post"
                                onClick={() => {
                                    handleRemovePost(uuid, data.AuthorUUID);
                                }}
                            >
                                Remove
                            </a>
                        </div>
                    ) : (
                        ""
                    )}
                </div>

                <div className="spotlight-image-container">
                    <div className="spotlight-image">
                        <img src={mainImage} alt="Spotlight" className="image" onClick={() => handleImageClick(mainImage)} />
                    </div>
                    <div className="image-previews">
                        {data &&
                            Array.isArray(data.ImageURLs) &&
                            data.ImageURLs.map((img, index) => {
                                var imgUrl = img;
                                const lastDotIndex = imgUrl.lastIndexOf(".");
                                const fileExtension = imgUrl.substring(lastDotIndex, imgUrl.length);
                                imgUrl = imgUrl.substring(0, lastDotIndex);
                                return (
                                    <img
                                        key={img} // Use img as key if it's unique; otherwise, use index if necessary
                                        src={imgUrl + "_preview" + fileExtension}
                                        alt={`Preview ${index}`}
                                        className="preview-image"
                                        onClick={() => {
                                            setMainImage(img);
                                        }}
                                    />
                                );
                            })}
                    </div>
                </div>

                <div className="like-share-container">
                    <div
                        onClick={async () => {
                            let result = callLikeAPI(post_uuid);
                            if (result) {
                                setLiked(!liked);
                            }
                        }}
                    >
                        <img
                            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZXBbEX8wPubpxeqAIwZUHEfDky04XVvBY8g&s"
                            className={liked ? "liked" : ""}
                        ></img>
                    </div>
                    <div
                        onClick={() => {
                            showModal();
                        }}
                    >
                        <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSfChVgTI8gitb-al0rptKp9X3GvzGJjbtm1w&s"></img>
                    </div>
                    <div id="myModal" className="s-modal">
                        <div className="s-modal-content">
                            <span
                                className="s-close"
                                onClick={() => {
                                    closeModal();
                                }}
                            >
                                &times;
                            </span>
                            <p>
                                Share this URL: <a id="modalURL" href="" target="_blank"></a>
                            </p>
                            <a className="lightSpecialButton" id="copyButton" onClick={(e) => copyToClipboard(e)}>
                                Copy to Clipboard
                            </a>
                        </div>
                    </div>
                </div>

                <div className="spotlight-title">{data && data.Title}</div>

                <div className="spotlight-description">
                    <p>{data && data.Description}</p>
                </div>
            </div>

            <div className="spotlight-comments">
                <h3>Comments</h3>
                <div className="comment-input">
                    <input
                        type="text"
                        value={newComment}
                        maxLength={200}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment"
                    />
                    <button onClick={handleAddComment}>Post</button>
                </div>
                <ul className="comment-list">
                    {comments.map((comment) => {
                        return (
                            <li key={comment.comment_uuid} className={"comment-item " + (comment.reply_to != "" ? "reply-item" : "")}>
                                <UserProfile uuid={comment.author_uuid} />
                                <div className="comment-content">
                                    <p id={comment.comment_uuid + "_text"} className="comment-text">
                                        {comment.text}
                                    </p>
                                    {checkOverflow(comment.comment_uuid + "_text") ? (
                                        <p
                                            onClick={() => {
                                                document.getElementById(`${comment.comment_uuid}_text`).style.maxHeight = "none";
                                            }}
                                        >
                                            View more
                                        </p>
                                    ) : (
                                        ""
                                    )}
                                    {/* <button className="reply-button" onClick={() => handleReply(comment.comment_uuid)}>
                                        Reply
                                    </button> */}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {selectedImage && (
                <div className="image-preview-overlay" onClick={closeImagePreview}>
                    <img src={selectedImage} alt="Preview" className="image-preview" />
                </div>
            )}
        </div>
    );
};

export default Spotlight;
