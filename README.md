# Inside Line Properties (ILP)

Inside Line Properties was my first attempt at building and deploying a real-world production web service. The goal was to create a modern real estate platform where users could browse properties, view details, and connect with sellers or agents.

Although the project reached a functional state and was deployed publicly, I eventually decided to take it down. This document describes the process, challenges, and reasons for winding it down.

---

## Project Overview

* **Purpose**: Provide a clean, accessible online experience for exploring property listings.
* **Stack**: React frontend, Golang backend, Firebase for hosting and database, and payment integration for premium listings.
* **Deployment**: Hosted as a live site with real users testing functionality.

---

## Development Process

1. **Ideation**: Started as a way to combine my interest in real estate with my goal of learning full-stack development.
2. **Implementation**: Focused on authentication, property listing CRUD features, and a modern design.
3. **Production Launch**: Pushed to production with live authentication, database, and payment handling.
4. **Iteration**: Collected feedback and attempted small improvements to the user and admin experience.

---

## Challenges

* **Payments**: The payment system was fragile and poorly implemented. Handling real money highlighted the risks of building monetization too early without a strong foundation.
* **First Production Service**: As my first live project, I underestimated deployment complexity, security concerns, and the importance of error handling.
* **Custom Login System**: I built my own login system for authentication. While I believe it could have been secure, it introduced unnecessary risk compared to proven identity providers. This was a key mistake in handling user data responsibly.
* **User Experience**: Real estate requires trust and reliability. ILP lacked polish and stability to compete with established services.
* **Sustainability**: Managing hosting costs, maintenance, and user support became impractical.

---

## Why I Took It Down

Inside Line Properties was ultimately not sustainable. The idea itself wasn’t well thought out for long-term success, and the execution reflected my beginner-level experience of creating full services at the time. Payments were unreliable, the login system was risky, and the value proposition was too weak compared to competitors.

Rather than patching a flawed foundation, I shut down the service to focus on better-structured projects. ILP was a learning milestone that taught me about:

* The difference between a prototype and a production-grade service
* The risks of handling payments without proper infrastructure
* The risks of building a custom login system without established security frameworks
* The importance of validating an idea before scaling

---

## Lessons Learned

* Start small and validate ideas before scaling to production.
* Build robust, testable systems before involving real users and payments.
* Use trusted authentication providers instead of reinventing security-critical systems.
* Failure is useful when documented — ILP helped shape my later projects into more sustainable and thoughtful products.

---

## Current Status

Inside Line Properties has been **discontinued** and is no longer available online.
