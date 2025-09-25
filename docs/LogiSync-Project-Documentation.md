# LogiSync Project Documentation

*STI College Davao - Comprehensive Project Documentation*

---

## Table of Contents

- [Introduction](#introduction)
- [Project Context](#project-context)
- [Purpose and Description](#purpose-and-description)
- [Objectives of the Study](#objectives-of-the-study)
- [Scope and Limitations](#scope-and-limitations)
- [Review of Related Literature](#review-of-related-literature)
- [Methodology](#methodology)
- [Requirements Analysis](#requirements-analysis)
- [Requirements Documentation](#requirements-documentation)
- [Design of Software, System, Product, and/or Processes](#design-of-software-system-product-andor-processes)
- [References](#references)
- [Appendices](#appendices)

---

## Introduction

### Project Context

Logistics is essential for businesses to manage shipments and deliver products on time, providing the necessary and timely transportation of goods and services across the entire supply chain. All industries depend on logistics to maintain competitive advantages, fulfill customer satisfaction, and follow timely delivery of products. On the other hand, although logistics is a key player, it suffers from systemic inefficiencies whereby operational performance and scalability are being held back. Such challenges are further exacerbated by the continuous use of outdated procedures, various tools, and manual workflows, which altogether hinder progress in an ever-developing digital economy.

Logistics operations, meanwhile, face other key challenges arising from delays in shipment tracking, inconsistency in pricing, and slow manual operations that amount to less efficient practices. Such challenges directly affect customer satisfaction, higher operational costs, and loss of new business opportunities. For example, companies are severely slow-down in real-time monitoring due to outdated systems. An example of this would be the manual of spreadsheets, standalone GPS devices, or paper-based records. Data entry by hand, a regular aspect of the logistics process, often leads to errors such as delayed deliveries, billing disputes, and customer complaints. As per MIT research in 2020, fragmented logistics systems contribute to unnecessary operational costs, due to a large share of work hours put into error correction and data reconciliation.

A root problem is the lack of integration among logistics processes. A variety of systems for order management, shipment tracking, and financial reporting are operated in separate silos-an inter-island system where workers wind up toggling between systems and duplicating one another's effort. Such disintegration slows down workflow efficiency and creates communication gaps between stakeholders. Customers receiving obsolete shipment statuses and disruption managers lacking real-time visibility to proactively handle anything mean that this system is immobilized through manual processing. Manual quote generation is yet another pain area, which involves some sophisticated calculations based on the cargo weight, dimensions, and its destination, a type of job that is simply begging for miscalculations that would eat through profit margins and customer trust.

For this specific reason, this research proposes a web-based logistics management system intended to unify critical workflows into a single system. The system aims to automate repetitive tasks like generating quotes and creating invoices while providing real-time visibility of shipment status through GPS integration and driver update. By combining tracking, order management, and billing, the solution addresses manual errors, operational cost reduction, and transparency across the logistics lifecycle.

The proposed system, therefore, directly confronts inefficiencies across three categories. First, a real-time shipment tracker enables the company to remotely witness delivery progress, thus reducing the potential for customers to raise issues.

---

## Purpose and Description

The objective of this study is to develop a comprehensive system that effectively manages and automates the logistics process, from supplier requests to customer deliveries. This system integrates features such as real-time vehicle tracking for ongoing shipments and automated pricing to eliminate calculation errors. By automating repetitive tasks, it enhances workflow productivity and overall efficiency.

Focusing on real-time tracking, order management, and invoice generation, the system streamlines logistics operations. It provides businesses with essential tools to monitor shipments, manage quotes and orders, generate invoices, handle billing and reporting, and analyze performance metrics. Additionally, the system ensures secure user access tailored to specific roles, allowing customers to track their items in real-time. This integrated approach not only boosts operational efficiency but also significantly enhances customer service by ensuring timely and accurate deliveries.

In conclusion, LogiSync is designed to resolve key operational challenges by automating processes and providing real-time insights. By enhancing efficiency, accuracy, and customer service, it empowers businesses to optimize their logistics operations and adapt swiftly to market demands. The implementation of this comprehensive solution promises to transform logistics management into a more streamlined and effective endeavor.

---

## Objectives of the Study

The main objective of this project is to develop an automated logistics platform with real time tracking to optimize operations and enhance customer service. Specifically, this project aims:

### • To develop a quotation and order-taking function

With the quotation and ordering management function, users can generate precise shipping cost estimates based on parameters like weight and dimensions, which promotes transparency and assists in budget planning. This integrated module also streamlines the picking, packing, and shipping processes, enabling administrators to oversee accepted orders and monitor their fulfillment status, ultimately boosting efficiency and customer satisfaction.

### • To develop a warehouse management module

This module will organize and track the exact location of goods associated with an existing order within the warehouse and optimize storage space. This will help provide finding goods within the warehouse more efficiently, enabling easy and accurate retrieval of goods during the fulfillment process. It will also provide status and location updates that reflect the movements of goods making sure that location data remains accurate throughout the fulfillment process.

### • To develop a shipment dispatch management module

This module will manage shipments and dispatch of goods. Admins can view and manage shipment details while ensuring safety compliance. This will improve shipment tracking, delivery coordination, and overall logistics efficiency.

### • To develop a billing and payment function

This function streamlines the billing process by enabling creation, tracking, and displaying details like invoice type, status, and due dates. To ensure timely payments, it notifies the head office manager when due dates near. The feature also maintains accurate transaction records and assists with follow-up reminders for overdue payments.

### • To develop a shipment monitoring function

This function keeps the customers updated by allowing any website visitor to monitor the status of their shipments as a guest by simply entering their tracking number, which then provides the user with the goods' complete history and current status.

### • To develop a report generation module

The report generation module will provide users with the tools to generate detailed reports and analyze logistics data effectively. It will support efficient budget management, monitor team performance, and facilitate strategic decision-making.

### • To create a client subscription service function

The subscription service offers three plans: a Basic Plan with a 30-day free trial for initial exploration, a Standard Plan providing exclusive access to the head office manager with limited features, and a Premium Plan that includes the head office manager and additional staff members like the booking manager, warehouse manager, and driver, all available in flexible 1, 3, or 5-year terms.

---

## Scope and Limitations

### Scope

The general purpose of this project is to enhance logistics operations through the development of a web-based logistics management system. This system aims to streamline order processing, shipment tracking, warehouse management, and delivery coordination, ultimately improving efficiency and reducing errors in the supply chain. Additionally, the system will provide real-time updates on delivery status, ensuring transparency and better communication between businesses and customers.

The web-based system will contain the following features:

#### • Shipment and Dispatch Coordination

This module handles shipment tracking and transport logistics, including data entry for shipments, delivery scheduling, and vehicle assignment. The system will allow admins to input and manage all shipment-related data, such as tracking numbers, receiver info, origin, destination, dates, status, booking, and departure. It also allows transport managers to oversee vehicle assignments, delivery schedules, routes, and budgets.

#### • Fulfillment Process Enhancement

This module aims to manage orders within the system. It will enhance the efficiency of the fulfillment processes. With this, administrators will be able to make sure that the process involving orders are organized and timely, ultimately improving customer satisfaction.

#### • Quote Creation and Management

The system will allow users to create shipping cost estimates based on parameters such as weight and dimensions. This functionality will provide clear and transparent cost estimates, aiding in budget planning and fostering trust with clients.

#### • Reporting and Analytics

The Reporting and Analytics Module will enable users to generate detailed reports and analyze logistics data effectively. By offering key insights, this module will enhance business operations and drive revenue growth through improved data transparency.

#### • Warehouse Management

The Warehouse Module is used to manage items that are either delivered by suppliers or picked up by the logistics company. It includes basic shelf management, allowing the warehouse manager to assign incoming items to specific storage locations or shelves. This helps organize stored items and improves handling efficiency for dispatch.

#### • Invoice Generation

Invoices are generated after the customer confirms the quoted price for the delivery. This module automates invoice creation to formalize the transaction between the logistics company and the customer, ensuring clear and timely billing based on the agreed quote.

#### • Subscription Management

The Subscription Module manages regular logistics service arrangements between customers and the company. This is especially useful for repeat clients like suppliers who frequently send items and want a fixed schedule or rate for deliveries.

### Limitations

The web-based system will be limited to the following:

#### • Basic Vehicle Management Functionality

The system can only handle simple vehicle tracking and scheduling. It does not include advanced features like checking the vehicle's condition or using smart tools to monitor performance in real time.

#### • Basic Warehouse Features

The Warehouse Module supports only basic shelf management, such as assigning items to shelves or locations. It does not include advanced tools like automated shelf suggestions, space optimization, or real-time item tracking using barcodes or RFID.

#### • Limited Billing Customization

Invoices are automatically created based on the approved quote, but they may have limited customization. For example, it might not support adding company logos, applying specific local tax formats, or adjusting layout designs to match business needs.

#### • Basic Subscription Features

The Subscription Module only supports simple recurring billing. It doesn't include advanced options like usage-based pricing, automatic reminders, or connecting with other payment systems.

#### • Limited Multi-Platform Order Integration

The Orders Management Module may not integrate seamlessly with all external ordering platforms or sales channels, which could cause delays in synchronization and fulfillment.

#### • Static Cost Estimation Parameters

The system may only provide estimates based on predefined parameters, limiting the ability to account for dynamic factors such as fluctuating fuel prices or unexpected surcharges that could affect final shipping costs.

#### • Data Visualization Limitations in Reporting

The Reporting Module may have limitations in data visualization capabilities, restricting users from easily interpreting complex data sets or generating customized reports tailored to specific business needs.

---

## Review of Related Literature

### E-Logistics and Digital Supply Chains: Reinventing Oman's Role as a Future Logistics Hub (Guillaume, 2025)

The review of related literature on the transformative potential of e-logistics and digital supply chains in Oman reveals a multifaceted landscape that underscores the importance of digital technologies in modern logistics management. E-logistics, which integrates digital tools and platforms into logistics operations, has emerged as a critical component for enhancing efficiency and effectiveness. It is recognized as a means to improve operational performance, reduce costs, and enhance customer satisfaction.

The role of digital transformation in logistics is increasingly acknowledged as a key driver of competitive advantage. Organizations that embrace digital technologies in their logistics operations can achieve significant improvements in service quality and operational efficiency. Digital transformation not only streamlines processes but also enhances decision making through data analytics and real-time tracking systems. Leveraging big data and analytics in logistics leads to enhanced visibility and control over supply chain activities.

However, despite the potential benefits of e-logistics, several challenges hinder its widespread adoption in Oman. Infrastructure limitations, regulatory hurdles, and a lack of skilled workforce in digital technologies pose significant barriers. There is a pressing need for government support and strategic partnerships to overcome these challenges. Fostering a collaborative ecosystem among stakeholders is essential to facilitate knowledge sharing and innovation in the logistics sector.

The logistics sector plays a crucial role in Oman's economic diversification efforts. Developing a robust logistics infrastructure can significantly contribute to non-oil GDP growth. The logistics sector can create new job opportunities and stimulate the emergence of local businesses in freight services, warehousing, and digital logistics. Furthermore, the integration of e-commerce logistics is expected to empower small and medium-sized enterprises (SMEs) by providing them with efficient fulfillment and delivery solutions.

Looking ahead, Oman has the potential to establish itself as a leader in logistics innovation within the region. Integrating smart technologies and sustainable practices in logistics operations can set a benchmark for other countries. Establishing logistics incubators and innovation hubs can support startups and foster a culture of entrepreneurship in the logistics sector.

In conclusion, the literature reviewed underscores the transformative potential of e logistics and digital supply chains in redefining Oman's logistics landscape. By addressing the challenges and leveraging its strategic advantages, Oman can position itself as a competitive logistics hub in the region. The insights gained from this review provide a foundation for the strategic recommendations outlined in the study, emphasizing the importance of digital transformation in shaping Oman's future logistics capabilities.

### Web-Based Logistics Tools for Small Firms: A Cost-Effective Approach to Shipment Tracking and Billing Automation (al-Maamari and Lee 2024)

Recent research by al-Maamari and Lee (2024) examined a web-based logistics system similar to our project. Their study involved 20 logistics companies in Oman testing the system for six months. The platform featured real-time shipment tracking and automated invoice generation. Results demonstrated significant improvements over traditional manual methods.

The findings revealed three key benefits from using the system. Delivery delays decreased by 22% due to instant status updates from drivers. Automated invoices reduced billing errors by 30% compared to manual entry. Customer complaints dropped 40% as clients could track orders online instead of calling for updates. These changes led to both cost savings and improved service quality.

However, the study identified several implementation challenges worth noting. About half of participating companies reported difficulties training employees in the new system. Long-time staff particularly resisted changing their established work routines. Rural operations faced additional hurdles with unreliable internet connectivity. Researchers recommended developing offline capabilities and more intuitive training materials.

The tested system incorporated several core functionalities relevant to our work. GPS technology enabled live monitoring of shipments in transit. Dynamic pricing automatically calculated costs using package dimensions and weight. Completed deliveries triggered immediate invoice generation and distribution. Custom user accounts provided appropriate access levels for different roles.

While effective, the system's $800 monthly price proved prohibitive for many small firms. Our project addresses this by streamlining features to reduce costs. We also incorporated flexible language support missing in the original study. These adaptations make the solution more accessible to budget-conscious operations.

This research confirms web-based tools can significantly benefit small logistics providers. However, affordability and ease of adoption remain critical factors for success. Our project builds on these findings while solving the identified pain points. The goal is delivering similar benefits through a more practical and cost-effective solution.

### Development of a Web-based Research Consortium Database Management System: Advancing Data-driven and Knowledge-based Project Management (Salvador et al., 2024)

The study of Salvador et al. (2024) focused on developing a centralized web-based system for managing data across 29 member institutions under the Central Luzon Agriculture, Aquatic and Natural Resources Research and Development Consortium (CLAARRDEC). One of the key problems addressed was the manual method of compiling research reports and tracking project progress, which often resulted in inconsistencies and delays in data retrieval.

The system was designed to allow real-time monitoring of projects and easier access to information, aiming to improve transparency and collaboration across institutions. This is relevant to logistics systems where accurate and up-to-date records, such as delivery logs, inventory updates, and order tracking are critical. By implementing modules for uploading, storing, and searching data, as well as generating reports, the project helped streamline operations and reduced the burden of manual work. These features are similar to what a logistics system needs, especially in businesses where real-time coordination and database integrity are essential for efficient order fulfillment and stock management.

### Synthesis

Digital tools such as real-time tracking, data analytics, and automation are critical for enhancing operational performance, reducing costs, and improving customer satisfaction. Oman's potential as a logistics hub depends on overcoming infrastructure and regulatory challenges while fostering collaboration among stakeholders. Studies (e.g., al-Maamari and Lee, 2024) demonstrate that web-based platforms with GPS tracking, automated billing, and dynamic pricing significantly reduce delays, errors, and customer complaints. However, affordability and ease of adoption are critical for small firms.

The CLAARRDEC system (Salvador et al., 2024) underscores the value of real-time data sharing and automated reporting for transparency and efficiency. Similar features (e.g., delivery logs, inventory updates) are essential for logistics systems.

LogiSync: is a tool that helps businesses run their delivery and shipping operations more smoothly. It does this by using automation and live updates to make things faster, more accurate, and better for customers. With LogiSync, companies can adjust quickly to changes and manage their logistics in a much easier and smarter way.

The difference between existing logistics platforms and our systems is that it integrates real-time tracking, automated quotes/invoicing, and centralized logistics modules into a cost effective web platform, unlike existing systems that are either too expensive (al-Maamari & Lee), non-logistics-specific (CLAARRDEC/Davao project), or overly niche (UAV-blockchain).

LogiSync bridges gaps in existing solutions by offering an integrated, affordable, and logistics-tailored system with automation at its core. LogiSync is a comprehensive, web-based logistics management system designed to automate and integrate key logistics workflows (shipment tracking, order and warehouse management, transport coordination, quotes, and data analytics).

---

## Methodology

### Technical Background

#### Overview of Related Technologies

Logistics companies today share a number of challenges, this includes management of repetitive tasks such us management of quotations, transportation, and order processing. And some companies continue to rely on conventional methods like paper and spreadsheets like Excel. Tracking multiple factors can be challenging for Logistics Officers. This project aims to develop a system to help Logistics companies achieve greater operational efficiency, this will also enhance decision making capabilities and help organize certain functions and boost productivity.

This web application will use ReactJS and Tailwind CSS for the front end. ReactJS helps us build reusable components to create a smooth and responsive user interface. Tailwind CSS allows for quick and flexible styling directly within the markup, making the design process faster and the app look good on different devices.

On the backend, the developers will use Laravel and MySQL. Laravel organizes the server-side code neatly and simplifies database interactions. MySQL is a database that securely stores user data and tasks, ensuring data reliability even under heavy use.

The development of LogiSync follows a structured approach to ensure a systematic and efficient process in building a comprehensive logistics management system. This methodology is divided into distinct phases, each building upon the previous one to ensure clarity, thoroughness, and alignment with project goals. The project ultimately adheres to the Waterfall Model, which provides a clear framework for managing the development process.

The project will commence with a feasibility study to assess technical, operational, and financial viability. Stakeholder interviews and market research will be conducted to identify pain points, validate the need for LogiSync, and prioritize core features using the MoSCoW method (Musthave, Should-have, Could-have, Won't-have). Once the most important are identified, writing down exactly what the system needs to do like how admins create shipments or how tracking updates work will be done.

Then during the design phase, the developers plan how everything looks and works, including drawing website layouts, designing the database, and making mockups with tools like Figma.

After that, building the system in small parts will begin on the coding phase, working in two-week cycles to add features like logins, GPS tracking, and billing. Each part will be tested as it is being finished.

Once all parts are built, testing on how they work together will start, like checking if creating a quote automatically makes an invoice and asking users to try it out. Speed test and security checks will also be tested.

When testing is done, the developers launch the system in a test environment first to fix last-minute issues, then roll it out slowly to real users while training them. Tools like AWS CloudWatch will monitor it to keep it running smoothly.

After launch, the developers will keep updating the system with fixes and new features based on feedback, and a support team will help users with problems.

This follows the Waterfall steps feasibility, requirements, design, coding, testing, deployment, and maintenance one after another. Each phase depends on finishing the one before it but adjustment of small things along the way depending on if users need changes will be done. This keeps things organized and makes sure the system solves real problems without getting too complicated.

#### Calendar of Activities

The Gantt chart presents the summary of activities. Listed are the activities and opposite them are their duration or periods of execution. Below are the legends of activity indication where BLUE indicates as starting or not finished and YELLOW as on progress or finished.

First, the developers brainstormed ideas for a title and topic. In the second and third week of February, these ideas are then presented during the title defense, and the best title was approved. The fourth week of February was spent on data gathering where the developers started researching and looking for companies for interview while the first week of March was spent on a face-to-face interview with a company.

The second week of March is where the writing began, with the data gathered from research and interview, the Project Context, Purpose and Description, Objectives, and Scope and Limitations was started. With Consultations from our adviser, the Project Context, Purpose and Description, Objectives, and Scope and Limitations were revised and updated.

In the second week of April, Research for Review of Related Literature was begun and all the members assigned compiled all of it in the fourth week of April including the Technical Background. The Objectives, Scope and Limitations, Review of Related Literature were then redefined once more after further consultations with the adviser, the Requirements Gathering and Analysis was started the same week.

The Requirements Gathering and Analysis was then revised and polished in the second week of May and in the same week, the Diagrams, Resources, Requirement Documentation and Appendix were documented.

#### Resources

##### Hardware

This section outlines the hardware resources the project needs for the development, testing, and deployment phase. There are 2 main devices used.

**Device Specifications:**

| Component | Device 1 | Device 2 |
|-----------|----------|----------|
| Processor(CPU) | AMD Ryzen 3 2200G | Intel Core i5 12400f |
| Operating System | Windows 10 | Windows 11 |
| Memory | 24 GB | 16GB 3600mHz |
| Storage | 1 TB | 1 TB |
| Monitor/Display | 15.6" FHD (1920x1080) | 24g11e Aoc 180Hz |
| Network Adapters | Intel® Wireless AC 9560 | Intel® Wireless AC 9560 |
| Others | External hard drive and card for backup | External hard drive and card for backup |

##### Software

This section refers to the software that was used to create the system. It refers to a list of software that is needed for the design, development, and testing of the system.

**Software Tools:**

| Software | Version |
|----------|---------|
| Visual Studio Code | 1.99.3 |
| MySQL | 8.4.5 |
| Laravel | Laravel 10.x |
| XAMPP | 8.2.12 |

---

## Requirements Analysis

The developers formulated a set of questions for the planned interview with the Logistics Officer and Accountant Executive. The information stated by the respondents along with the research data collected were then used as a basis for writing the documentation, most especially the project context, purpose and description, objectives, and scope and limitations.

Admins and head office managers are the primary users of LogiSync. They use the system to manage all logistics tasks. For example, the Shipments Management Module lets admins create shipments by inputting details like sender/receiver info, origin, and destination. Each shipment generates a unique tracking number, which admins share with their clients. The Transportation Management Module helps head office managers assign drivers to deliveries, plan routes, and monitor vehicle schedules.

Drivers, who are part of the admin's team, receive tasks through the system and update delivery statuses via mobile devices. Admins also use the Orders Management Module to oversee order fulfillment. The warehouse manager update order statuses like "packed" or "shipped" under admin supervision.

Clients (the admin's customers) do not have full accounts. Instead, they access a public tracking page on the admin's website or a shared link. By entering their tracking number clients will see real-time updates like "in transit" or "delivered."

The Quotes Management Module lets admins calculate shipping costs automatically based on package weight and dimensions. After delivery, the Invoice Module generates bills automatically, reducing manual errors. Admins can also use the Reporting and Analytics Module to review performance metrics like delivery times or driver efficiency.

LogiSync offers two subscription plans designed to meet the needs of businesses at different stages. The Standard Plan includes all core features shipment tracking, order management, quotes, invoices, and email support while supporting up to 100 shipments per month. However, it allows users to add up to 10 warehouses only. On the other hand, the Pro Plan includes the same features as the Standard Plan but removes the warehouse limitation, allowing users to add an unlimited number of warehouses.

Staff and drivers have limited access for example, drivers can only update delivery statuses and view the shipment details, while admins manage permissions. Clients only see their own shipment details via tracking numbers. Usability is prioritized: the admin dashboard is simple, with clear menus for tasks like creating shipments or viewing reports. Training guides help admins onboard staff quickly.

Overall, LogiSync gives admins full control over their logistics work, while clients get a hassle-free way to track packages. The system cuts out paperwork, reduces errors, and saves time.

---

## Requirements Documentation

The development of LogiSync, a web-based logistics and warehouse management system, began with a thorough look at the real needs of warehouse and logistics teams. This involved carefully studying their current work, how they handle receiving goods, locate goods within the warehouse, manage orders, and arrange shipping. The following sections detail some of LogiSync's main features, which are based on this initial in-depth understanding. Diagrams illustrating the system's structure will also be included.

### Admin Login Page

The Admin Login page allows administrators to securely log in to the system by entering their username/email address or password.

### Admin and Head Office Manager Dashboard

The LogiSync admin dashboard provides an overview of key data points, enabling administrators to efficiently navigate to different modules by clicking on the corresponding overview sections. For example, clicking on the general overview of quotes will take the administrator directly to the quotation module, streamlining access to critical information and facilitating efficient management of logistics and warehouse operations.

### Shipment Menu List

The admin can view shipment details, the status of the shipment, and search shipment location and history. This includes information such as the origin and destination of the shipment, the expected delivery date, the current location of the shipment, and a record of all previous locations and status changes.

### List of Orders

The admin can create new orders, view details of orders, and view the status of orders. This includes the ability to input customer and order information, and shipping addresses. Order details that can be viewed include date created, total cost, and its current status. Order status can be tracked through various stages such as pending, processing, shipped, and delivered.

### Quotation Module

The user can create new quotations where they insert details such as dimensions, weight, and distance. The user can also search and view quotations and their status on this page.

### Guest Shipment Tracking Page

Guests can enter the tracking number of the shipment they wish to follow. The page will then display the shipment history, including the estimated delivery time and current status. For each status update, the page will also provide additional details such as the location and time of the update.

### Warehouse Manager Dashboard

The Warehouse Manager's dashboard provides a detailed view of all warehouse-related data and activities, offering insights into shipping statuses, and operational efficiency. The Warehouse Manager is also promptly notified by the Head Office manager regarding new orders that require management, ensuring a smooth and coordinated workflow for processing and fulfilling customer requests. This enables proactive management of warehouse operations and ensures timely order fulfillment.

### Transportation Page

The booking manager can select orders, then vehicles, and then plan the routes. They can also create a schedule for when to start loading the selected vehicle and notify the driver. The system will also incorporate tools for route optimization and real-time tracking.

---

## Design of Software, System, Product, and/or Processes

The developers designed use cases to visually outline how various actors, such as the administrator, head office manager, and booking manager interact with the system to achieve specific goals. These goals are represented as use cases. By illustrating these interactions, the diagram provides a clear, high-level understanding of the system's functionalities.

The developers also have created a Data Flow Diagram (DFD) this will visually depict how data moves between key processes and data stores within the system, involving actors like the administrator, head office manager, and booking manager to achieve their specific goals. These goals translate into data transformations and flows represented in the DFD. By illustrating these data movements and storage points, the diagram offers a clear, high-level understanding of how information is managed and utilized within the system to support its functionalities.

A hierarchical chart for this system will visually represent the organizational structure and relationships between functionalities, often reflecting the roles of the administrator, head office manager, and booking manager in accessing and managing these areas. These charts have a top-level node representing the overall system, branching down into key modules.

The database diagram shows key components like Shipments, Warehouse, and Orders, illustrating how they connect and relate to other elements such as Users and Transport. These connections represent how different pieces of information within the logistics and warehouse operations are organized and linked in the system's database.

### System Modules Overview

#### Subscription Module
- Renew Subscription
- Manage Subscription
- Client Subscription Record
- Update Subscription Status
- Renewal Reminder
- Process Payment
- Generate Invoice
- Activate Subscription

#### Order Module
- Monitor Order Status
- Retrieve Order Details
- Input Order Information
- Packing of Orders
- Store Order Data
- Update Order Status
- Preparing for Shipment
- Send New Order Status Notification

#### Shipment and Tracking Module
- Create New Shipment
- Assign Driver
- Generate Tracking Number
- Search Tracking Number
- Store Shipment Data
- View Shipment Information
- Update Shipment Status

#### Transportation Module
- Review and Select Orders
- Assign Loads to Vehicle
- Create Schedule
- Manage Vehicles
- Plan Routes
- Assign Driver
- View Transportation Information
- Store Transportation Information

#### Staff Privileges Module
- Create User Account
- Edit User Account
- Assign Roles and Permissions
- Reset Password
- Deactivate Account
- User Accounts Records

### Data Flow Diagrams

The system includes comprehensive data flow diagrams for:
- Subscription processing and management
- Quotation and warehouse operations
- Order management workflow
- Shipment tracking and updates
- Transportation coordination

### Hierarchical Charts

The system architecture includes hierarchical representations for:
- Head Office Manager functionalities
- Warehouse Manager operations
- Booking Manager responsibilities
- Driver access and capabilities

### Database Design

The database structure incorporates interconnected tables for:
- **Tracking_History**: Managing shipment tracking records
- **Shipments**: Core shipment information and status
- **Transport**: Vehicle and driver assignments
- **Orders**: Customer orders and fulfillment status
- **Users**: System user accounts and roles
- **Subscriptions**: Customer subscription management
- **Warehouses**: Storage location management
- **Inventory**: Stock tracking and management
- **Order_Details**: Detailed order item information
- **Quotes**: Price estimation and quotation records

---

## References

Jean, Guillaume. (2025). E-Logistics and Digital Supply Chains: Reinventing Oman's Role as a Future Logistics Hub.

Salvador, M. A., Botangen, K. A., Rabang, M. C., Salinas, I. C., Naagas, M., & Balagot, A. (2024, November 1). Development of a web-based Research Consortium Database Management System: Advancing data-driven and knowledge-based project management. arXiv.org. https://arxiv.org/abs/2411.00483

Team, G. (2023, May 5). Iterative Waterfall Model | Software Engineering. Geektonight. https://www.geektonight.com/iterative-waterfall-model-software-engineering/

Case Study: How we created a Logistics Management System. (2021). DDI Development. Retrieved May 15, 2025, from https://ddi-dev.com/blog/case/how-we-created-a-logistics-management-system/

---

## Appendices

### Appendix A: Project Development Model

**Waterfall Model (Iterative)**
The project follows the Waterfall development methodology with iterative improvements:
- Feasibility Study
- Requirements Analysis and Specification
- Design
- Coding and Unit Testing
- Integration and System Testing
- Maintenance

### Appendix B: Resource Persons

**Dominic R. Bantigue**
- Capstone Project Adviser

**Jessiel Chris Hilot**
- Capstone Project Coordinator

---

*This documentation represents a comprehensive overview of the LogiSync project developed by STI College Davao students. The project aims to revolutionize logistics management through innovative web-based solutions that integrate real-time tracking, automated processes, and user-friendly interfaces to enhance operational efficiency and customer satisfaction.*