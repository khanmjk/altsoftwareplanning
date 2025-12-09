/**
 * visualizations.js
 * 
 * Initialization file for visualization services.
 * All visualization logic has been migrated to SystemOverviewView class.
 * 
 * This file only contains initialization code that must run on page load.
 */

// Initialize Mermaid via MermaidService (required on page load)
MermaidService.init({ startOnLoad: false, theme: 'default' });
