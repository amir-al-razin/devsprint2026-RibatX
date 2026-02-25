General Guidelines
Eligibility: Participation is strictly open to students currently enrolled in their 1st, 2nd, or 3rd year of IUT.
Participants can use any development stack they want and the final project could be of any kind (desktop app, mobile app or website).
One student must be a member of only one team. No student can participate as a member in different teams at the same time.
Team Independence: Teams must work independently. Any form of copying code or sharing solutions with other teams will result in immediate disqualification for all involved parties.
AI Policy: You are encouraged to use AI tools such as ChatGPT, GitHub Copilot, Google Gemini or any other forms of AI. However, you must disclose all AI tools used in your README file.

Repository & Submission Guidelines
Create a brand-new GitHub repository during the event.
The repository must be publicly accessible.
Ensure that all code, configurations, and documentation are written entirely during the hackathon.
Maintain a consistent, clear, and meaningful commit history that reflects steady progress and teamwork.
Include a comprehensive and well-structured README file describing the project, its features, setup instructions, and AI usage details.

Deliverables
1
Requirement Analysis & System Architecture: A clear description of the problem being addressed, the identified requirements, and a detailed overview of the system design, including component interactions and overall architecture.
2
Tools and Stack Report: A brief report outlining the technologies, frameworks, and tools used in the project, along with concise reasoning for why each choice was made.
3
GitHub Link: A link to the project's GitHub repository containing the complete source code, commit history, and documentation.
4
Demonstration Video: A short video (maximum 3 minutes) showcasing the key features, functionality, and workflow of the application.
5
Deployment Link: A link to the live, deployed version of the application for testing and evaluation (optional but encouraged).

Evaluation and Final Presentation
• Shortlisting: Based on overall performance, the top-performing teams will be selected to advance to the Final Presentation phase.
• Presentation Format: Shortlisted teams will deliver a live demonstration of their project, highlighting core features, system design, and functionality.
• Q&A Session: Teams must be prepared for a 5-minute technical question-and-answer session, during which judges will ask in-depth questions to assess understanding of the system, implementation choices, and technical decisions.
• Documentation: Final evaluation will also take into account the quality, clarity, and completeness of the submitted documentation files.

An Example
This is the story of MoodThanda, a food-tech startup that's about to go from a local favorite to a digital powerhouse. To get there, we need to build more than just an app; we need a living, breathing digital ecosystem.

The MoodThanda Story: Scaling the Flavor
Imagine MoodThanda on a busy Friday night. The kitchen is buzzing, the aroma of spices fills the air, and online orders are pouring in. Right now, the business is thriving, but the technology behind it needs to evolve. We aren't just building a menu; we are building a platform that can handle a massive surge of hungry customers during a seasonal festival without breaking a sweat.

As the lead architect, your mission is to move away from a single, clunky system and toward a Microservice Architecture. This means if the notification system hits a snag, customers can still browse the menu and place orders. It's about building a resilient, "always-on" experience where updates happen behind the scenes while the milkshakes keep flowing.

The Core Ingredients (Our Services)
To keep things simple yet powerful for our initial launch, we are decomposing MoodThanda into five essential services:

1
Authentication Service: The "Bouncer." It ensures every user is who they say they are.
2
Menu Service: The "Digital Catalog." This serves up images, descriptions, and real-time pricing.
3
Inventory Service: The "Stock Keeper." It tracks if we have enough ingredients for that midnight craving.
4
Notification Service: The "Messenger." It sends the "Order Received" and "Out for Delivery" alerts.
5
Monitoring Service: The "Doctor." It watches the health of all services to ensure 100% uptime.
Your Mission Tasks
To bring the MoodThanda platform to life, we will focus on these key architectural milestones:

1
Design the Modular Blueprint: Break the platform into the five services mentioned above. You'll need to decide how they "talk" to each other so that if the Menu Service updates a price, the rest of the system stays in sync.
2
Architect for Growth & Resilience: Design the system so each service can scale independently. If everyone is checking the menu but no one is ordering yet, we should be able to boost the Menu Service's power without wasting resources elsewhere.
3
Implement "Quality Control" (Testing & CI): To ensure no "bugs" end up in our digital kitchen, you must:
Write 2–3 Unit Tests for a core service (e.g., testing if the Inventory Service correctly rejects an order when stock is zero).
Build a CI (Continuous Integration) Pipeline that automatically runs these tests every time a developer submits new code. If the tests fail, the code is blocked from entering the system.
4
Build the "Auto-Heal" Logic: Configure the platform to be fault-tolerant. If the Notification Service fails, the system should be designed to restart it automatically so the core ordering process doesn't crash.
5
Eyes on the Engine (Monitoring): Set up a centralized dashboard. We need to see real-time traffic spikes and error logs in one place so we can fix issues before a single customer notices a delay