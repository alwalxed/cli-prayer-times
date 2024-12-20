# CLI Prayer Times

A simple command-line tool to display daily prayer times based on your location.

## Features

- Get accurate prayer times for your city.
- Option to change the city for different prayer times.
- User-friendly CLI with prompts for input.

## Installation

To install the CLI tool globally, use the following command:

```bash
npm i -g cli-prayer-times
```

## Usage

#### Display Prayer Times

##### To display prayer times for your current city:

```
prayers
```

###### This will fetch and display the prayer times for the city stored in your configuration file.

#### Change City

##### To change the city and view the prayer times for a new location:

```bash
prayers -c
```

###### You will be prompted to enter the name of your city. Once you provide it, the tool will fetch and display the prayer times for that location.

## Screenshots

Here’s an example of what the prayer times look like in your terminal:
![Prayer times in terminal](https://raw.githubusercontent.com/alwalxed/cli-prayer-times/refs/heads/main/screenshot.png)

## Contributing

If you encounter any issues or have suggestions, please submit them via issues or pull requests.

## License

This project is licensed under the MIT License. See the [LICENSE](https://github.com/alwalxed/cli-prayer-times/blob/main/LICENSE) file for details.

## Acknowledgements

- [**Zero-Deps-Prayer-Times**](https://github.com/alwalxed/zero-deps-prayer-times) - Prayer times calculation library
- [**Geocode.xyz**](https://geocode.xyz/) - Geocoding API for city coordinates
