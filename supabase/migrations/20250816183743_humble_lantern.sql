@@ .. @@
 CREATE INDEX idx_admin_applications_status ON admin_applications(status);
+
+-- Create bank_details table for secure banking information
+CREATE TABLE bank_details (
+    id INT PRIMARY KEY AUTO_INCREMENT,
+    unique_id VARCHAR(20) UNIQUE NOT NULL,
+    application_id VARCHAR(20) NOT NULL,
+    bank_name VARCHAR(100) NOT NULL,
+    ifsc_code_encrypted TEXT NOT NULL,
+    branch_name VARCHAR(100) NOT NULL,
+    account_number_encrypted TEXT NOT NULL,
+    account_holder_name VARCHAR(100) NOT NULL,
+    village VARCHAR(50) NOT NULL,
+    district VARCHAR(50) NOT NULL,
+    pincode VARCHAR(6) NOT NULL,
+    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
+    FOREIGN KEY (application_id) REFERENCES registrations(application_id)
+);
+
+-- Add unique_id and bank_details_submitted to admin_applications
+ALTER TABLE admin_applications 
+ADD COLUMN unique_id VARCHAR(20) UNIQUE,
+ADD COLUMN bank_details_submitted BOOLEAN DEFAULT FALSE,
+ADD COLUMN rejection_reason TEXT;
+
+-- Create indexes for bank_details
+CREATE INDEX idx_bank_details_unique_id ON bank_details(unique_id);
+CREATE INDEX idx_bank_details_application ON bank_details(application_id);