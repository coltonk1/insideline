import { useState, useEffect } from "react";

function App() {
    const [invoiceData, setInvoiceData] = useState();

    const fetchInvoice = async () => {
        let res = await getInvoice();
        setInvoiceData(res);
    };

    useEffect(() => {
        fetchInvoice();
    }, []);

    async function getInvoice() {
        const body = { token: localStorage.getItem("token") };

        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/getInvoice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        let result = await response.json();
        return result;
    }

    return (
        <main>
            {invoiceData && (
                <div>
                    <div>{invoiceData.CardDetails}</div>
                    <div>{invoiceData.ExpirationDate}</div>
                    <br />
                    <div>{invoiceData.NextInvoiceDate}</div>
                    <div>{invoiceData.NextInvoicePrice}</div>
                </div>
            )}
        </main>
    );
}

export default App;
