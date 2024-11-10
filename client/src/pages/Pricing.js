import { useEffect, useState } from "react";

import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
    "pk_live_51HlI6qJludLhGkYCc9sJelLOZ23Tj48ZurQFRVs0uF2LQBuMaRtStguShCoiKM5ztRGqgyVY3rOouBli2ztT502U00MOBXEsmb"
    // "pk_live_51HlI6qJludLhGkYCc9sJelLOZ23Tj48ZurQFRVs0uF2LQBuMaRtStguShCoiKM5ztRGqgyVY3rOouBli2ztT502U00MOBXEsmb"
);

function App() {
    import("../styles/pricing.css");

    const [price, setPrice] = useState(0);

    const calculatePrice2 = (listings) => {
        listings = parseInt(listings);

        const tiers = [
            { max: 1, price: 10 },
            { max: 4, price: 25 },
            { max: 10, price: 50 },
            { max: 25, price: 100 },
            { max: 60, price: 225 },
            { max: 350, price: 1000 },
        ];

        // Handle cases where the number of listings is below the first tier or above the last tier
        if (listings <= tiers[0].max) {
            return tiers[0].price;
        } else if (listings >= tiers[tiers.length - 1].max) {
            return parseInt((tiers[tiers.length - 1].price / tiers[tiers.length - 1].max) * listings);
        }

        // Find the correct tier to interpolate between
        for (let i = 0; i < tiers.length - 1; i++) {
            if (listings <= tiers[i + 1].max) {
                const lowerTier = tiers[i];
                const upperTier = tiers[i + 1];

                // Linear interpolation
                const slope = (upperTier.price - lowerTier.price) / (upperTier.max - lowerTier.max);
                const interpolatedPrice = lowerTier.price + slope * (listings - lowerTier.max);

                return parseInt(interpolatedPrice);
            }
        }

        // Fallback case (should not be reached)
        return (1000 / 350) * listings;
    };

    const [listings, setListings] = useState(1);

    useEffect(() => {
        updatePricing(listings);
    }, [listings]);

    const updatePricing = (x) => {
        let result = calculatePrice2(x);
        setPrice(result);
    };

    const [units, setUnits] = useState(1);
    const [totalPrice, setTotalPrice] = useState(10.0);
    const stripe = useStripe();
    const elements = useElements();

    useEffect(() => {
        // Update the price when units change
        setTotalPrice(calculatePrice2(units));
    }, [units]);

    const [invoiceData, setInvoiceData] = useState();

    async function getInvoice() {
        const body = { token: localStorage.getItem("token") };

        try {
            const response = await fetch(process.env.REACT_APP_SERVER_URL + "/upcomingInvoice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                let result = await response.text();
                throw new Error(result, "Error");
            }
            let result = await response.json();
            setInvoiceData(result);
            return result;
        } catch (err) {
            console.log(err);
        }
    }

    useEffect(() => {
        if (localStorage.getItem("token")) {
            getInvoice();
        }
    }, []);

    const handleSubmit = async (event) => {
        // event.preventDefault();

        // if (!stripe || !elements) {
        //     return;
        // }

        // // setProcessing(true);

        // var { error, paymentMethod } = await stripe.createPaymentMethod({
        //     type: "card",
        //     card: elements.getElement(CardElement),
        // });

        // if (error) {
        //     console.log("error!" + error.message);
        //     return;
        // }

        // Convert price to cents
        const amount = price * 100;

        // const body = { email: "coltonkaraffa@gmail.com", price_id: "price_1PtWQEJludLhGkYCbtn75CMc" };
        const body = { email: "coltonkaraffa@gmail.com" };

        // Create PaymentIntent on the server
        // const response = await fetch(process.env.REACT_APP_SERVER_URL + "/createCheckoutSession", {
        //     method: "POST",
        //     headers: { "Content-Type": "application/json" },
        //     body: JSON.stringify(body),
        // });

        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/createPortalSession", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        // console.log(await response.json());

        let result = await response.json();
        console.log(result);
        if (!result.id) {
            console.log(result.message);
        } else {
            console.log("Great!");
        }
    };

    function getTrueListings(x) {
        // Function to snap value to nearest discrete value
        function snapToDiscreteValue(value) {
            let closest = discreteValues[0];
            let minDiff = Math.abs(value - closest);
            for (let i = 1; i < discreteValues.length; i++) {
                const diff = Math.abs(value - discreteValues[i]);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = discreteValues[i];
                }
            }
            return closest;
        }

        let newValue = snapToDiscreteValue(x);
        return newValue;
    }

    const discreteValues = [1, 5, 10, 15, 20, 30, 40, 50, 75, 100, 200, 300, 400, 500];

    return (
        <main>
            {/* pk_live_51HlI6qJludLhGkYCc9sJelLOZ23Tj48ZurQFRVs0uF2LQBuMaRtStguShCoiKM5ztRGqgyVY3rOouBli2ztT502U00MOBXEsmb */}
            {/* <script async src="https://js.stripe.com/v3/pricing-table.js"></script> */}
            {/* <p>
                Manage your payment <a href="https://billing.stripe.com/p/login/eVacOUcY10mu5Ec6oo">account here.</a>
            </p> */}
            {/* <a
                onClick={(e) => {
                    handleSubmit(e);
                }}
            >
                Get billing portal
            </a> */}
            {/* <p>
                To purchase a plan, go to <a href="/mySub">manage your subscription</a>
            </p> */}
            <div className="options">
                <PurchaseOption
                    hasSubscription={invoiceData !== undefined}
                    description={
                        <ul>
                            <li>7 Active Listings</li>
                            {/* <li>Basic Portfolio</li> */}
                        </ul>
                    }
                    price={"$0.00"}
                    title={"Free Plan"}
                />
                <PurchaseOption
                    hasSubscription={invoiceData !== undefined}
                    active={invoiceData && invoiceData.subscription_name == "Standard Plan"}
                    description={
                        <ul>
                            <li>20 Active Listings</li>
                            {/* <li>Basic Portfolio</li> */}
                        </ul>
                    }
                    price={"$10.00"}
                    title={"Standard Plan"}
                    priceID={"price_1PunFlJludLhGkYCJGdtr0Oe"}
                />
                <PurchaseOption
                    hasSubscription={invoiceData !== undefined}
                    active={invoiceData && invoiceData.subscription_name == "Premium Plan"}
                    description={
                        <ul>
                            <li>100 Active Listings</li>
                            {/* <li>Portfolio With Basic Customization</li> */}
                        </ul>
                    }
                    price={"$25.00"}
                    title={"Premium Plan"}
                    priceID={"price_1PunFpJludLhGkYCdWbW9RVA"}
                />
                {/* <PurchaseOption
                    hasSubscription={invoiceData !== undefined}
                    active={invoiceData && invoiceData.subscription_name == "Premium Plan"}
                    description={
                        <ul>
                            <li>100 Active Listings</li>

                        </ul>
                    }
                    price={"$25.00"}
                    title={"Premium Plan"}
                    priceID={"price_1PunFqJludLhGkYCSgqMnW3V"}
                /> */}
                {/* <PurchaseOption
                    hasSubscription={invoiceData !== undefined}
                    active={invoiceData && invoiceData.subscription_name == "Pro Plan"}
                    description={
                        <ul>
                            <li>50 Active Listings</li>

                        </ul>
                    }
                    price={"$100.00"}
                    title={"Pro Plan"}
                    priceID={"price_1PunFsJludLhGkYC9XKdmFYD"}
                />
                <PurchaseOption
                    hasSubscription={invoiceData !== undefined}
                    active={invoiceData && invoiceData.subscription_name == "Business Plan"}
                    description={
                        <ul>
                            <li>600 Active Listings</li>
               
                        </ul>
                    }
                    price={"$1000.00"}
                    title={"Business Plan"}
                    priceID={"price_1PunFtJludLhGkYCv1IQuUks"}
                /> */}
            </div>
            {/* {localStorage.getItem("token") ? <div>Checkout</div> : <div>Please log in to purchase a subscription.</div>} */}
        </main>
    );
}

function PurchaseOption({ description, title, price, priceID, active, hasSubscription }) {
    const createCheckoutSession = async (priceID) => {
        console.log("creating");
        if (!localStorage.getItem("token")) {
            window.location.href = "/login";
            return;
        }

        const body = { token: localStorage.getItem("token"), price_id: priceID };

        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/createCheckoutSession", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        let result = await response.json();
        window.location.href = result.url;
        if (!result.id) {
            console.log(result.message);
        } else {
            console.log("Great!");
        }
    };

    const createBillingPortal = async (priceID) => {
        if (!localStorage.getItem("token")) {
            window.location.href = "/login";
            return;
        }

        const body = { token: localStorage.getItem("token") };

        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/createPortalSession", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            let output = await response.text();
            if (output == "Customer not found\n" || output == "Customer has no subscription\n") {
                createCheckoutSession(priceID);
            }
            return;
        }

        let result = await response.json();
        window.location.href = result.url;
    };

    return (
        <div className={"purchase-option" + (active ? " active-option" : "")}>
            <div className="title">
                {title}
                {active ? <p className="your-plan">(current)</p> : ""}
            </div>
            <div className="description">{description}</div>
            <div className="price-amt">
                {price} <div className="per-month">per month</div>
            </div>

            {hasSubscription ? (
                <a
                    className="lightSpecialButton"
                    onClick={() => {
                        if (title === "Free Plan") {
                            createBillingPortal();
                            return;
                        }
                        createBillingPortal(priceID);
                    }}
                >
                    {active ? "Current Plan" : "Update"}
                </a>
            ) : (
                <a
                    className="lightSpecialButton"
                    onClick={() => {
                        if (title === "Free Plan") return;
                        createBillingPortal(priceID);
                    }}
                >
                    {title === "Free Plan" ? "Active" : "Purchase"}
                </a>
            )}
        </div>
    );
}

function App2() {
    return (
        <Elements stripe={stripePromise}>
            <App />
        </Elements>
    );
}

export default App2;
