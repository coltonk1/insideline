import { useState, useEffect } from "react";

function App() {
    import("../styles/subDetails.css");
    const [invoiceData, setInvoiceData] = useState();

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
            // if (output == "Customer not found\n" || output == "Customer has no subscription\n") {
            // }
            return;
        }

        let result = await response.json();
        window.location.href = result.url;
    };

    const fetchInvoice = async () => {
        let res = await getInvoice();
        setInvoiceData(res);
    };

    useEffect(() => {
        fetchInvoice();
    }, []);

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
            console.log(result);
            return result;
        } catch (err) {
            console.log(err);
        }
    }

    const getDate = () => {
        let date = new Date(invoiceData.due_date * 1000);
        date = date.toLocaleDateString("en-US", {
            // weekday: "short",
            // year: "numeric",
            month: "numeric",
            day: "numeric",
        });
        return date;
    };

    return (
        <main>
            {!invoiceData ? (
                <div>
                    <div className="invoice">No upcoming invoice.</div>
                    <div className="information">
                        <p>To purchase a subscription, go to the pricing page:</p>
                        <a href="/pricing" className="lightSpecialButton">
                            Pricing
                        </a>
                    </div>
                </div>
            ) : (
                ""
            )}
            {invoiceData && (
                <div>
                    <div className="invoice">
                        <div className="amt-due">${invoiceData.amount_due}</div>
                        <div className="due-date">Charged on {getDate().toString()}</div>
                        <div className="card-details">
                            <p>Using card:</p>
                            **** {invoiceData.last4}
                            <p>
                                {invoiceData.exp_month} / {invoiceData.exp_year.toString().slice(-2)}
                            </p>
                        </div>
                        <div className="information">
                            <p>To update your subscription or card information, visit the billing portal.</p>
                            <a onClick={() => createBillingPortal()} className="lightSpecialButton">
                                Billing Portal
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default App;
