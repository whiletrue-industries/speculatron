# Speculatron

### A clone-able repository for speculative timelines

## Intro

This project allows to collaborate around a map-based timeline, allowing to add 'content' to the timeline - fake tweets, instagram posts, wikipedia pages and others - to create an immersive story anchored in time and geographical location.

A simple demo can be found here https://akariv.github.io/speculatron/

## Creating your own

This repo is intended for you to fork and modify based on your needs.

It contains a simple configuration file, which, after modifying, can be used to create a new instance of the app. The site is automatically built and deployed using GitHub Pages - all you need to do is connect it with your credentials and you're good to go.

### Configuration File

The main configuration file is `CONFIGURATION.ts`.

You'll need to edit it with your own values and credentials.

```typescript
export const AIRTABLE_BASE = '<your-airtable-base>';
export const AIRTABLE_API_KEY = '<your-airtable-api-key>';
export const AIRTABLE_DETAILS_FORM = '<your-airtable-details-form>';

export const MAPBOX_STYLE = '<your-mapbox-style>';
export const MAPBOX_ACCESS_TOKEN = '<your-mapbox-access-token>';
```

### AirTable

The data for the timeline is stored in an AirTable base.

You can see the template of this base, which you can copy to your own account here: https://airtable.com/appuAa65B1iKwaXXb/tbll7x1j2P2mODiXk/viw5UCjE9GNZAOfZy

Once you have the base, add a read-only user to it (note: it needs to be a dedicated user that has only read-only access to that base - not a regular user).

Then, edit the config file with the values for the base and the API key.

Finally, the 'Content' table has a 'New Entry' form which you can use to add new entries to the timeline.
Add its share link to the config file.

### MapBox

The map in this site uses MapBox. You can create a free account there, design you own map (or use one of the defaults).

Once you have it, add the style and access token to the config file.


### GitHub

For everything to work you might need to enable Actions and Github Pages in your forked repository.

To deploy the site on a custom domain, add a CNAME file to the root of the repository containing the name of your domain. You also need to make some DNS modifications to point your domain to the GitHub Pages domain - please consult with the GitHub documentation for more information.

## Development of this project 

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 14.0.1.

### Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.
