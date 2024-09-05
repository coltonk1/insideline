function DisplayProperty({ imgURL, price, address, payload, postUUID }) {
    function formatNumberWithCommas(number) {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    return (
        <div
            className="displayItem"
            onClick={() => {
                window.location.href = "/propertyInfo?uuid=" + postUUID;
            }}
        >
            <img src={imgURL}></img>
            <div className="listingInfo">
                <title>${formatNumberWithCommas(price)}</title>
                {/* <div className="listing-desc-container">
                    <div className="listing-descriptors">
                        {Object.entries(payload).map(([key, value]) => {
                            if (key === "address" || key === "price") return;
                            return <div>{key + " " + value}</div>;
                        })}
                    </div>
                </div> */}
                <div>{address}</div>
            </div>
        </div>
    );
}

export default DisplayProperty;
