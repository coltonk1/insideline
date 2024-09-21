package main

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/stripe/stripe-go/v79"
	portal "github.com/stripe/stripe-go/v79/billingportal/session"
	checkout "github.com/stripe/stripe-go/v79/checkout/session"
	"github.com/stripe/stripe-go/v79/customer"
	"github.com/stripe/stripe-go/v79/invoice"
	"github.com/stripe/stripe-go/v79/plan"
	"github.com/stripe/stripe-go/v79/product"
	"github.com/stripe/stripe-go/v79/subscription"
)

// checkoutSession
// upcomingInvoice
// createCustomer
// subscriptionUpdate
// updateCard
// retryPayment
// cancelActiveSubscription

func createPortalSession(w http.ResponseWriter, r *http.Request) {
	if handleCORS(w, r) {
        return
    }

	var reqBody struct {
		Token string `json:"token"`
	}

    if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

	token_data, err := getTokenPayload(reqBody.Token)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

	email := token_data["email"].(string)

    // Retrieve the customer ID based on the email address
    params := &stripe.CustomerListParams{
        Email: stripe.String(email),
    }
    customerList := customer.List(params)

    var customerID string
    for customerList.Next() {
        cust := customerList.Customer()
        customerID = cust.ID
        break // Assuming email is unique, we take the first match
    }

    if customerID == "" {
        http.Error(w, "Customer not found", http.StatusNotFound)
        return
    }

	_, _, err = GetUserSubscription(token_data["email"].(string))
	if(err != nil) {
		http.Error(w, "Customer has no subscription", http.StatusNotFound)
        return
	}

    // Create a new Customer Portal session
    portalParams := &stripe.BillingPortalSessionParams{
        Customer: stripe.String(customerID),
        ReturnURL: stripe.String("https://insidelineproperties.com/home"), // URL to redirect after exiting the portal
    }

    session, err := portal.New(portalParams)
    if err != nil {
        http.Error(w, "Failed to create billing portal session", http.StatusInternalServerError)
        return
    }

    // Respond with the URL to the Customer Portal
    response := map[string]string{
        "url": session.URL,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

func createCheckoutSession(w http.ResponseWriter, r *http.Request) {
	if handleCORS(w, r) {
        return
    }

    var req struct {
        PriceID string `json:"price_id"`
        Token   string `json:"token"`
    }
    _ = json.NewDecoder(r.Body).Decode(&req)

	token_data, err := getTokenPayload(req.Token)
	if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

	email := token_data["email"].(string)

    params := &stripe.CheckoutSessionParams{
        PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
        LineItems: []*stripe.CheckoutSessionLineItemParams{
            {
                Price:    stripe.String(req.PriceID),
                Quantity: stripe.Int64(1),
            },
        },
        Mode: stripe.String("subscription"),
        SuccessURL: stripe.String("https://insidelineproperties.com/subInfo"),
        CancelURL:  stripe.String("https://insidelineproperties.com/subInfo"),
        CustomerEmail: stripe.String(email),
		AutomaticTax: &stripe.CheckoutSessionAutomaticTaxParams{
			Enabled: stripe.Bool(true),
		},
		AllowPromotionCodes: stripe.Bool(true),
    }

    session, err := checkout.New(params)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(session)
}

func upcomingInvoice(w http.ResponseWriter, r *http.Request) {
	if handleCORS(w, r) {
        return
    }

	var reqBody struct {
		Token string `json:"token"`
	}

    if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

	token_data, err := getTokenPayload(reqBody.Token)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

	email := token_data["email"].(string)

    // Retrieve the customer ID based on the email address
    params := &stripe.CustomerListParams{
        Email: stripe.String(email),
    }
    customerList := customer.List(params)

    var customerID string
    var cust *stripe.Customer
    if customerList.Next() {
        cust = customerList.Customer()
        customerID = cust.ID
    } else {
        http.Error(w, "Customer not found", http.StatusNotFound)
        return
    }

    customerParams := &stripe.CustomerParams{}
    _, err = customer.Get(customerID, customerParams)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

	_, sub_id, err := GetUserSubscription(token_data["email"].(string))
	if(err != nil) {
		http.Error(w, "Customer has no subscription", http.StatusNotFound)
        return
	}

    subParams := &stripe.SubscriptionParams{}
    subParams.AddExpand("default_payment_method")
    sub, err := subscription.Get(sub_id, subParams)
    if(err != nil) {
		http.Error(w, err.Error(), http.StatusNotFound)
        return
	}

    planID := sub.Items.Data[0].Plan.ID
    plan_, err := plan.Get(planID, nil)
    if err != nil {
        log.Fatalf("Failed to retrieve plan: %v", err)
    }

    prod, err := product.Get(plan_.Product.ID, nil)
    if err != nil {
        log.Fatalf("Failed to retrieve product: %v", err)
    }

    invoice_params := &stripe.InvoiceUpcomingParams{
        Customer: stripe.String(customerID),
        Subscription: stripe.String(sub_id),
    }

    invoice, err := invoice.Upcoming(invoice_params)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    if sub.DefaultPaymentMethod == nil || sub.DefaultPaymentMethod.Card == nil {
        http.Error(w, "No default payment method.", http.StatusInternalServerError)
        return
    }
    cardDetails := sub.DefaultPaymentMethod.Card

    type InvoiceDetails struct {
        Last4           string `json:"last4"`
        ExpMonth        int64    `json:"exp_month"`
        ExpYear         int64    `json:"exp_year"`
        AmountDue       int64  `json:"amount_due"`
        AmountRemaining int64  `json:"amount_remaining"`
        DueDate         int64  `json:"due_date"`
        AutoCharge      string `json:"auto_charge"`
        SubName         string  `json:"subscription_name"`
        SubId           string  `json:"sub_id"`
    }

    details := InvoiceDetails{
        Last4:           cardDetails.Last4,
        ExpMonth:        cardDetails.ExpMonth,
        ExpYear:         cardDetails.ExpYear,
        AmountDue:       invoice.AmountDue,
        AmountRemaining: invoice.AmountRemaining,
        DueDate:         sub.CurrentPeriodEnd,
        AutoCharge:      string(invoice.CollectionMethod),
        SubName:         prod.Name,
        SubId:           prod.ID,
    }

    json.NewEncoder(w).Encode(details)
}

// func createCustomer(w http.ResponseWriter, r *http.Request) {
// 	if handleCORS(w, r) {
//         return
//     }

//     var req struct {
//         Email string `json:"email"`
//     }
//     _ = json.NewDecoder(r.Body).Decode(&req)

//     newCustomer, err := customer.New(&stripe.CustomerParams{
//         Email: stripe.String(req.Email),
//     })

//     if err != nil {
//         http.Error(w, err.Error(), http.StatusInternalServerError)
//         return
//     }

//     json.NewEncoder(w).Encode(newCustomer)
// }

// func updateSubscription(w http.ResponseWriter, r *http.Request) {
// 	if handleCORS(w, r) {
//         return
//     }

//     var req struct {
//         CustomerID string `json:"customer_id"`
//         PriceID    string `json:"price_id"`
//     }
//     if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
//         http.Error(w, "Invalid request body", http.StatusBadRequest)
//         return
//     }

//     // Fetch existing subscriptions for the customer
//     params := &stripe.SubscriptionListParams{
//         Customer: stripe.String(req.CustomerID),
//     }
//     params.SetStripeAccount(r.Header.Get("Stripe-Account"))
//     subs := subscription.List(params)

//     for subs.Next() {
//         sub := subs.Subscription()
//         if sub.Status == stripe.SubscriptionStatusIncomplete ||
//             sub.Status == stripe.SubscriptionStatusPastDue ||
//             sub.Status == stripe.SubscriptionStatusUnpaid {
//             json.NewEncoder(w).Encode(map[string]string{"status": "existing_subscription", "subscription_id": sub.ID})
//             return
//         }
//     }
//     if err := subs.Err(); err != nil {
//         http.Error(w, err.Error(), http.StatusInternalServerError)
//         return
//     }

//     // Cancel active subscriptions
//     params.Status = stripe.String(string(stripe.SubscriptionStatusActive))
//     subs = subscription.List(params)
//     for subs.Next() {
//         sub := subs.Subscription()
//         _, err := subscription.Cancel(sub.ID, &stripe.SubscriptionCancelParams{})
//         if err != nil {
//             http.Error(w, err.Error(), http.StatusInternalServerError)
//             return
//         }
//     }
//     if err := subs.Err(); err != nil {
//         http.Error(w, err.Error(), http.StatusInternalServerError)
//         return
//     }

//     // Create a new subscription
//     newSubParams := &stripe.SubscriptionParams{
//         Customer:         stripe.String(req.CustomerID),
//         Items:            []*stripe.SubscriptionItemsParams{{Price: stripe.String(req.PriceID)}},
//         CollectionMethod: stripe.String(string(stripe.InvoiceCollectionMethodSendInvoice)),
//     }
//     newSubParams.SetIdempotencyKey(req.CustomerID + "-" + req.PriceID)
//     newSub, err := subscription.New(newSubParams)
//     if err != nil {
//         http.Error(w, err.Error(), http.StatusInternalServerError)
//         return
//     }

//     json.NewEncoder(w).Encode(map[string]string{"status": "success", "subscription_id": newSub.ID})
// }

// func updatePaymentMethod(w http.ResponseWriter, r *http.Request) {
// 	if handleCORS(w, r) {
//         return
//     }

// 	var req struct {
// 		CustomerID      string `json:"customer_id"`
// 		PaymentMethodID string `json:"payment_method_id"`
// 	}
// 	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
// 		http.Error(w, "Invalid request payload", http.StatusBadRequest)
// 		return
// 	}

// 	// Attach the new payment method to the customer
// 	_, err := paymentmethod.Attach(req.PaymentMethodID, &stripe.PaymentMethodAttachParams{
// 		Customer: stripe.String(req.CustomerID),
// 	})
// 	if err != nil {
// 		http.Error(w, err.Error(), http.StatusInternalServerError)
// 		return
// 	}

// 	// Update the customer's default payment method
// 	_, err = customer.Update(req.CustomerID, &stripe.CustomerParams{
// 		InvoiceSettings: &stripe.CustomerInvoiceSettingsParams{
// 			DefaultPaymentMethod: stripe.String(req.PaymentMethodID),
// 		},
// 	})
// 	if err != nil {
// 		http.Error(w, err.Error(), http.StatusInternalServerError)
// 		return
// 	}

// 	w.WriteHeader(http.StatusOK)
// 	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
// }

// func retryPayment(w http.ResponseWriter, r *http.Request) {
// 	if handleCORS(w, r) {
//         return
//     }

// 	var req struct {
// 		SubscriptionID string `json:"subscription_id"`
// 	}
// 	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
// 		http.Error(w, "Invalid request payload", http.StatusBadRequest)
// 		return
// 	}

// 	// Retrieve the latest invoice for the subscription
// 	subs, err := subscription.Get(req.SubscriptionID, nil)
// 	if err != nil {
// 		// Handle the error
// 		http.Error(w, err.Error(), http.StatusInternalServerError)
// 		return
// 	}

// 	// Retrieve the latest invoice ID from the subscription
// 	invoiceID := subs.LatestInvoice.ID

// 	// Attempt to pay the invoice
// 	_, err = invoice.Pay(invoiceID, nil)
// 	if err != nil {
// 		http.Error(w, err.Error(), http.StatusInternalServerError)
// 		return
// 	}

// 	w.WriteHeader(http.StatusOK)
// 	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
// }