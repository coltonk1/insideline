function App() {
    import("../styles/homepage.css");
    return (
        <main>
            <section id="top">
                <div>
                    <img src="https://www.tennessean.com/gcdn/presto/2019/10/11/PNAS/adf1101a-0f8c-404f-9df3-5837bf387dfd-1_Exterior_House_Beautiful_Whole_Home_Concept_House_Castle_Homes_Photo_Reed_Brown_Photography.jpg?width=1200&disable=upscale&format=pjpg&auto=webp"></img>

                    <title>
                        <p>Trying to</p>find your new home?
                    </title>
                    <a href="propertyDiscovery" className="lightSpecialButton">
                        Discover Homes
                    </a>
                </div>
                <div className="or">OR</div>
                <div>
                    <img src="https://www.mydomaine.com/thmb/pxx02mRnUbasWHLGtg9U_9r-TZM=/2000x0/filters:no_upscale():strip_icc()/brophyinteriors.com-3dec9a32a5294eeca14ed2e92381e265.jpg"></img>
                    <title>
                        <p>Trying to</p> make your home brand new?
                    </title>
                    <a href="spotlightDiscovery" className="lightSpecialButton">
                        Discover Designs
                    </a>
                </div>
            </section>

            <Information />
        </main>
    );
}

function Information() {
    return (
        <div>
            <section>
                <h2>What We Offer</h2>
                <p>
                    Inside Line offers a robust and intuitive platform designed specifically for realtors and property owners. We aim to
                    simplify and enhance the entire real estate process by providing a suite of powerful tools and features that streamline
                    property management, listing, and showcasing.
                </p>
                {/* <ul>
                    <li>
                        <strong>Intuitive Property Listing:</strong> Easily create and manage property listings with our user-friendly
                        interface. Customize each listing with high-quality images, detailed descriptions, and key features.
                    </li> */}
                {/* <li>
                        <strong>Seamless Integration:</strong> Integrate with popular CRM and marketing tools to streamline your workflow
                        and improve your outreach.
                    </li> */}
                {/* </ul> */}
            </section>
            <section>
                <h2>Planned Features</h2>
                <p>
                    We are continually working to enhance Inside Line with new features that will further benefit our users. Here are some
                    exciting features we plan to introduce:
                </p>
                <ul className="main-list">
                    <li>
                        <strong>User Experience & Interface:</strong>
                        <ul>
                            <li>Mobile App</li>
                            <li>Customizable Portfolios</li>
                            <li>Community Features and Forums</li>
                            <li>Customizable Listing Templates</li>
                            <li>Customizable Property Brochures</li>
                            <li>Client Onboarding and Tutorials</li>
                            <li>Document Templates for Contracts</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Analytics & Reporting:</strong>
                        <ul>
                            <li>Enhanced Real-Time Analytics Dashboard</li>
                            <li>Market Analysis Tools</li>
                            <li>Lead Scoring</li>
                            <li>Advanced Property Valuation Tools</li>
                            <li>Interactive Property Comparison</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Marketing & Outreach:</strong>
                        <ul>
                            <li>Automated Marketing Tools</li>
                            <li>Integration with Social Media Platforms</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Security & Compliance:</strong>
                        <ul>
                            <li>Enhanced Security Features</li>
                            <li>Document Management and E-Signatures</li>
                            <li>API Access for Third-Party Integration</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Integration & Tools:</strong>
                        <ul>
                            <li>Data Import/Export Capabilities</li>
                            <li>Neighborhood Insights</li>
                            <li>Virtual Staging Tools</li>
                            <li>Mortgage Calculator</li>
                        </ul>
                    </li>
                    <li>
                        <strong>CRM & Client Management:</strong>
                        <ul>
                            <li>Customer Relationship Management (CRM) Integration</li>
                            <li>Real-Time Messaging</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Quality of Life Features:</strong>
                        <ul>
                            <li>Basic Quality of Life Features</li>
                        </ul>
                    </li>
                </ul>
            </section>
            {/* <section>
                <h2>Why Choose Us?</h2>
                <p>
                    At Inside Line, we prioritize user experience and provide a robust platform that meets the needs of both realtors and
                    property owners. Our team is dedicated to offering exceptional customer support and continuously improving our features
                    based on user feedback.
                </p>
                <ul>
                    <li>
                        <strong>Reliable Support:</strong> Our support team is available to assist you with any questions or issues. We
                        provide comprehensive resources and personalized help to ensure your success.
                    </li>
                    <li>
                        <strong>Innovation:</strong> We are committed to staying ahead of industry trends and incorporating the latest
                        technology to enhance our platform.
                    </li>
                    <li>
                        <strong>Community Focused:</strong> Join a growing community of real estate professionals and property owners who
                        benefit from our platform.
                    </li>
                </ul>
            </section> */}
            <section>
                <h2>Get Started Today</h2>
                <p>
                    Ready to experience the difference with Inside Line? Whether you're a realtor looking to manage your listings more
                    effectively or an individual seeking to list your property, our platform is designed to meet your needs.
                </p>
                <p>
                    <a href="/signup" class="cta-button">
                        Sign up now
                    </a>{" "}
                    or{" "}
                    <a href="/support" class="cta-button">
                        contact us
                    </a>{" "}
                    for more information.
                </p>
                {/* <img src="path-to-your-image.jpg" alt="Inside Line Platform" /> */}
            </section>
        </div>
    );
}

export default App;
