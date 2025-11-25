import { MapPin } from "lucide-react";

const ScoutingNetworkMap = () => {
  // Sample scouting locations across Europe
  const scoutingLocations = [
    { country: "England", city: "London", x: 520, y: 290 },
    { country: "Spain", city: "Madrid", x: 420, y: 480 },
    { country: "Germany", city: "Berlin", x: 650, y: 280 },
    { country: "Italy", city: "Rome", x: 620, y: 490 },
    { country: "France", city: "Paris", x: 510, y: 360 },
    { country: "Netherlands", city: "Amsterdam", x: 560, y: 250 },
    { country: "Portugal", city: "Lisbon", x: 340, y: 490 },
    { country: "Belgium", city: "Brussels", x: 540, y: 275 },
    { country: "Czech Republic", city: "Prague", x: 680, y: 295 },
    { country: "Austria", city: "Vienna", x: 670, y: 345 },
    { country: "Poland", city: "Warsaw", x: 730, y: 260 },
    { country: "Denmark", city: "Copenhagen", x: 605, y: 200 },
    { country: "Sweden", city: "Stockholm", x: 650, y: 140 },
    { country: "Norway", city: "Oslo", x: 600, y: 120 },
  ];

  // European countries borders (more realistic simplified paths)
  const europeanCountries = [
    { name: "England", path: "M 505 265 Q 510 260 515 258 L 525 257 Q 535 258 540 262 Q 545 268 548 275 L 550 285 Q 552 295 548 305 L 545 315 Q 540 320 532 322 L 520 323 Q 512 320 508 312 L 505 300 Q 503 285 505 275 Z" },
    { name: "France", path: "M 475 315 Q 480 310 490 308 L 510 307 Q 525 310 535 320 L 545 335 Q 550 350 553 365 L 558 385 Q 560 405 555 425 L 548 440 Q 540 450 525 453 L 505 455 Q 490 452 478 445 L 468 432 Q 463 418 462 402 L 460 380 Q 458 360 463 342 L 470 325 Q 475 315 475 315 Z" },
    { name: "Spain", path: "M 345 445 Q 355 438 370 435 L 395 432 Q 415 433 435 438 L 455 445 Q 468 455 475 468 L 480 485 Q 482 502 478 518 L 470 535 Q 462 548 448 555 L 428 560 Q 410 562 392 560 L 372 555 Q 358 548 350 535 L 343 518 Q 340 500 342 482 L 345 465 Q 348 452 345 445 Z" },
    { name: "Portugal", path: "M 310 465 Q 315 458 323 455 L 338 452 Q 350 453 358 460 L 365 472 Q 368 485 368 498 L 367 515 Q 365 530 358 542 L 348 553 Q 338 560 325 562 L 310 563 Q 298 560 290 550 L 283 535 Q 280 518 282 502 L 285 485 Q 290 472 310 465 Z" },
    { name: "Germany", path: "M 565 250 Q 575 245 588 243 L 610 242 Q 630 245 648 252 L 665 262 Q 678 275 685 290 L 690 308 Q 693 328 690 345 L 685 362 Q 678 375 665 382 L 645 388 Q 625 390 605 387 L 585 380 Q 572 370 565 355 L 560 335 Q 558 315 560 295 L 563 275 Q 565 260 565 250 Z" },
    { name: "Italy", path: "M 590 395 Q 595 390 603 388 L 618 387 Q 630 390 638 398 L 645 412 Q 650 428 652 445 L 653 470 Q 652 495 648 518 L 642 540 Q 635 555 622 565 L 605 572 Q 590 575 575 570 L 562 560 Q 553 548 550 532 L 548 512 Q 548 492 552 472 L 558 450 Q 565 430 575 415 L 585 402 Q 590 395 590 395 Z" },
    { name: "Netherlands", path: "M 535 235 Q 540 230 548 228 L 560 227 Q 572 230 580 238 L 588 250 Q 590 260 588 270 L 583 280 Q 578 287 568 290 L 555 292 Q 543 290 535 282 L 528 270 Q 525 258 528 247 L 532 238 Q 535 235 535 235 Z" },
    { name: "Belgium", path: "M 515 268 Q 520 263 528 262 L 540 262 Q 550 265 556 272 L 560 282 Q 560 290 556 297 L 548 303 Q 540 306 530 305 L 520 302 Q 513 295 512 285 L 513 275 Q 515 268 515 268 Z" },
    { name: "Switzerland", path: "M 565 348 Q 570 343 578 342 L 592 342 Q 603 345 610 352 L 615 363 Q 616 372 613 380 L 607 388 Q 600 393 590 394 L 578 393 Q 568 388 563 378 L 560 365 Q 560 355 563 348 Q 565 348 565 348 Z" },
    { name: "Austria", path: "M 635 328 Q 642 323 652 322 L 670 322 Q 688 325 700 332 L 710 343 Q 713 355 710 365 L 703 375 Q 695 382 683 385 L 668 386 Q 653 383 642 373 L 635 360 Q 633 345 635 335 Q 635 328 635 328 Z" },
    { name: "Poland", path: "M 695 215 Q 705 210 718 209 L 740 210 Q 760 215 775 225 L 788 240 Q 792 258 790 275 L 785 292 Q 778 305 765 312 L 745 317 Q 725 318 708 312 L 692 300 Q 685 285 685 268 L 688 248 Q 692 230 695 215 Z" },
    { name: "Czech Republic", path: "M 658 278 Q 663 273 672 272 L 688 272 Q 702 275 712 283 L 718 295 Q 718 305 713 313 L 705 320 Q 697 324 686 324 L 672 322 Q 662 315 658 303 L 656 290 Q 656 283 658 278 Z" },
    { name: "Denmark", path: "M 578 188 Q 583 183 592 182 L 608 183 Q 622 188 630 198 L 635 210 Q 635 220 630 228 L 620 235 Q 610 238 598 237 L 585 233 Q 578 225 577 213 L 578 200 Q 578 188 578 188 Z" },
    { name: "Sweden", path: "M 625 95 Q 632 88 642 85 L 658 84 Q 672 88 682 98 L 690 115 Q 695 135 695 155 L 693 180 Q 688 200 678 215 L 665 225 Q 650 230 635 225 L 622 215 Q 615 200 615 182 L 617 160 Q 620 135 625 115 Q 625 100 625 95 Z" },
    { name: "Norway", path: "M 575 78 Q 582 70 593 65 L 612 62 Q 628 65 640 75 L 650 90 Q 655 108 653 128 L 648 150 Q 640 168 628 180 L 612 188 Q 598 192 585 188 L 573 178 Q 568 163 568 145 L 570 123 Q 573 100 575 88 Q 575 78 575 78 Z" },
    { name: "Greece", path: "M 735 478 Q 742 473 752 472 L 770 473 Q 785 478 795 488 L 802 503 Q 803 518 798 530 L 790 542 Q 780 550 766 552 L 750 551 Q 738 545 732 532 L 728 515 Q 728 498 732 485 Q 735 478 735 478 Z" },
    { name: "Turkey", path: "M 815 458 Q 825 453 840 452 L 870 453 Q 895 458 912 468 L 925 483 Q 928 500 922 515 L 912 528 Q 900 538 882 542 L 858 543 Q 838 538 825 525 L 817 508 Q 815 488 817 473 Q 815 463 815 458 Z" },
    { name: "Scotland", path: "M 508 218 Q 513 213 522 212 L 535 213 Q 545 218 550 228 L 553 240 Q 552 250 546 258 L 537 264 Q 528 266 520 263 L 510 255 Q 507 243 508 232 Q 508 223 508 218 Z" },
    { name: "Ireland", path: "M 438 248 Q 443 243 452 242 L 465 244 Q 475 250 480 260 L 482 273 Q 480 283 473 290 L 463 295 Q 453 296 445 291 L 438 281 Q 436 268 438 258 Q 438 248 438 248 Z" },
    { name: "Romania", path: "M 748 358 Q 755 353 765 352 L 783 354 Q 798 360 808 372 L 813 388 Q 813 405 806 418 L 796 428 Q 785 434 771 434 L 756 431 Q 748 423 745 408 L 745 388 Q 746 372 748 363 Q 748 358 748 358 Z" },
    { name: "Serbia", path: "M 708 398 Q 713 393 722 392 L 735 394 Q 745 400 750 410 L 752 423 Q 750 433 743 440 L 733 444 Q 723 445 715 439 L 708 428 Q 707 413 708 403 Q 708 398 708 398 Z" },
    { name: "Croatia", path: "M 658 388 Q 663 383 672 382 L 685 384 Q 695 390 700 400 L 702 413 Q 700 423 693 430 L 683 434 Q 673 435 665 429 L 658 418 Q 657 403 658 393 Q 658 388 658 388 Z" },
  ];

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-3xl font-bebas">SCOUTING NETWORK ACROSS EUROPE</h3>
        <p className="text-muted-foreground">
          Our extensive scouting presence spanning {scoutingLocations.length} major cities
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section */}
        <div className="lg:col-span-2 bg-card rounded-lg p-6 border">
          <svg
            viewBox="0 0 1000 600"
            className="w-full h-auto"
            style={{ maxHeight: "600px" }}
          >
            {/* Flag Pattern Definitions */}
            <defs>
              {/* England - St George's Cross */}
              <pattern id="flag-england" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <rect width="60" height="60" fill="#FFFFFF"/>
                <rect x="25" width="10" height="60" fill="#CE1124"/>
                <rect y="25" width="60" height="10" fill="#CE1124"/>
              </pattern>

              {/* France - Tricolor */}
              <pattern id="flag-france" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="20" height="40" fill="#002395"/>
                <rect x="20" width="20" height="40" fill="#FFFFFF"/>
                <rect x="40" width="20" height="40" fill="#ED2939"/>
              </pattern>

              {/* Spain */}
              <pattern id="flag-spain" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="60" height="40" fill="#AA151B"/>
                <rect y="10" width="60" height="20" fill="#F1BF00"/>
              </pattern>

              {/* Portugal */}
              <pattern id="flag-portugal" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="24" height="40" fill="#006600"/>
                <rect x="24" width="36" height="40" fill="#FF0000"/>
              </pattern>

              {/* Germany */}
              <pattern id="flag-germany" x="0" y="0" width="60" height="30" patternUnits="userSpaceOnUse">
                <rect width="60" height="10" fill="#000000"/>
                <rect y="10" width="60" height="10" fill="#DD0000"/>
                <rect y="20" width="60" height="10" fill="#FFCE00"/>
              </pattern>

              {/* Italy */}
              <pattern id="flag-italy" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="20" height="40" fill="#009246"/>
                <rect x="20" width="20" height="40" fill="#FFFFFF"/>
                <rect x="40" width="20" height="40" fill="#CE2B37"/>
              </pattern>

              {/* Netherlands */}
              <pattern id="flag-netherlands" x="0" y="0" width="60" height="30" patternUnits="userSpaceOnUse">
                <rect width="60" height="10" fill="#AE1C28"/>
                <rect y="10" width="60" height="10" fill="#FFFFFF"/>
                <rect y="20" width="60" height="10" fill="#21468B"/>
              </pattern>

              {/* Belgium */}
              <pattern id="flag-belgium" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="20" height="40" fill="#000000"/>
                <rect x="20" width="20" height="40" fill="#FDDA24"/>
                <rect x="40" width="20" height="40" fill="#EF3340"/>
              </pattern>

              {/* Switzerland - Red with white cross */}
              <pattern id="flag-switzerland" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <rect width="32" height="32" fill="#FF0000"/>
                <rect x="11" y="6" width="10" height="20" fill="#FFFFFF"/>
                <rect x="6" y="11" width="20" height="10" fill="#FFFFFF"/>
              </pattern>

              {/* Austria */}
              <pattern id="flag-austria" x="0" y="0" width="60" height="30" patternUnits="userSpaceOnUse">
                <rect width="60" height="30" fill="#ED2939"/>
                <rect y="10" width="60" height="10" fill="#FFFFFF"/>
              </pattern>

              {/* Poland */}
              <pattern id="flag-poland" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="60" height="20" fill="#FFFFFF"/>
                <rect y="20" width="60" height="20" fill="#DC143C"/>
              </pattern>

              {/* Czech Republic */}
              <pattern id="flag-czech-republic" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="60" height="20" fill="#FFFFFF"/>
                <rect y="20" width="60" height="20" fill="#D7141A"/>
                <polygon points="0,0 0,40 30,20" fill="#11457E"/>
              </pattern>

              {/* Denmark */}
              <pattern id="flag-denmark" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="60" height="40" fill="#C60C30"/>
                <rect x="17" width="7" height="40" fill="#FFFFFF"/>
                <rect y="17" width="60" height="6" fill="#FFFFFF"/>
              </pattern>

              {/* Sweden */}
              <pattern id="flag-sweden" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="60" height="40" fill="#006AA7"/>
                <rect x="17" width="7" height="40" fill="#FECC00"/>
                <rect y="17" width="60" height="6" fill="#FECC00"/>
              </pattern>

              {/* Norway */}
              <pattern id="flag-norway" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="60" height="40" fill="#BA0C2F"/>
                <rect x="17" width="10" height="40" fill="#FFFFFF"/>
                <rect y="15" width="60" height="10" fill="#FFFFFF"/>
                <rect x="19" width="6" height="40" fill="#00205B"/>
                <rect y="17" width="60" height="6" fill="#00205B"/>
              </pattern>

              {/* Greece */}
              <pattern id="flag-greece" x="0" y="0" width="60" height="45" patternUnits="userSpaceOnUse">
                <rect width="60" height="45" fill="#0D5EAF"/>
                <rect y="5" width="60" height="5" fill="#FFFFFF"/>
                <rect y="15" width="60" height="5" fill="#FFFFFF"/>
                <rect y="25" width="60" height="5" fill="#FFFFFF"/>
                <rect y="35" width="60" height="5" fill="#FFFFFF"/>
              </pattern>

              {/* Turkey */}
              <pattern id="flag-turkey" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="60" height="40" fill="#E30A17"/>
                <circle cx="27" cy="20" r="9" fill="#FFFFFF"/>
                <circle cx="30" cy="20" r="7" fill="#E30A17"/>
                <polygon points="37,20 39,22 42,21 40,24 42,26 39,25 37,28 36,25 33,26 35,24 33,21 36,22" fill="#FFFFFF"/>
              </pattern>

              {/* Scotland */}
              <pattern id="flag-scotland" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="60" height="40" fill="#0065BD"/>
                <polygon points="0,0 12,20 0,40" fill="#FFFFFF"/>
                <polygon points="60,0 48,20 60,40" fill="#FFFFFF"/>
                <polygon points="0,0 30,10 60,0" fill="#FFFFFF"/>
                <polygon points="0,40 30,30 60,40" fill="#FFFFFF"/>
              </pattern>

              {/* Ireland */}
              <pattern id="flag-ireland" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="20" height="40" fill="#169B62"/>
                <rect x="20" width="20" height="40" fill="#FFFFFF"/>
                <rect x="40" width="20" height="40" fill="#FF883E"/>
              </pattern>

              {/* Romania */}
              <pattern id="flag-romania" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="20" height="40" fill="#002B7F"/>
                <rect x="20" width="20" height="40" fill="#FCD116"/>
                <rect x="40" width="20" height="40" fill="#CE1126"/>
              </pattern>

              {/* Serbia */}
              <pattern id="flag-serbia" x="0" y="0" width="60" height="30" patternUnits="userSpaceOnUse">
                <rect width="60" height="10" fill="#C6363C"/>
                <rect y="10" width="60" height="10" fill="#0C4076"/>
                <rect y="20" width="60" height="10" fill="#FFFFFF"/>
              </pattern>

              {/* Croatia */}
              <pattern id="flag-croatia" x="0" y="0" width="60" height="30" patternUnits="userSpaceOnUse">
                <rect width="60" height="10" fill="#FF0000"/>
                <rect y="10" width="60" height="10" fill="#FFFFFF"/>
                <rect y="20" width="60" height="10" fill="#171796"/>
              </pattern>
            </defs>

            {/* Background */}
            <rect width="1000" height="600" fill="hsl(var(--background))" />

            {/* Country Fills with Flags */}
            {europeanCountries.map((country) => (
              <g key={country.name}>
                <path
                  d={country.path}
                  fill={`url(#flag-${country.name.toLowerCase().replace(/ /g, '-')})`}
                  stroke="hsl(var(--border))"
                  strokeWidth="2"
                  className="opacity-60 hover:opacity-80 transition-opacity"
                >
                  <title>{country.name}</title>
                </path>
              </g>
            ))}

            {/* Scouting Location Points */}
            {scoutingLocations.map((location, idx) => (
              <g key={idx}>
                {/* Pulse effect */}
                <circle
                  cx={location.x}
                  cy={location.y}
                  r="12"
                  fill="hsl(var(--primary))"
                  className="animate-ping opacity-20"
                />
                {/* Main marker */}
                <circle
                  cx={location.x}
                  cy={location.y}
                  r="6"
                  fill="hsl(var(--primary))"
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer hover:r-8 transition-all"
                >
                  <title>{location.city}, {location.country}</title>
                </circle>
              </g>
            ))}

            {/* Connection lines (sample) */}
            <g opacity="0.1" stroke="hsl(var(--primary))" strokeWidth="1">
              <line x1="520" y1="290" x2="510" y2="360" />
              <line x1="510" y1="360" x2="420" y2="480" />
              <line x1="650" y1="280" x2="680" y2="295" />
              <line x1="560" y1="250" x2="540" y2="275" />
            </g>
          </svg>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/50" />
              <span>Active Scouting Location</span>
            </div>
          </div>
        </div>

        {/* Stats & Details Section */}
        <div className="space-y-4">
          <div className="bg-card rounded-lg p-4 border">
            <h4 className="font-bebas text-xl mb-3">NETWORK COVERAGE</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Cities Covered</span>
                <span className="font-bold text-xl">{scoutingLocations.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Countries</span>
                <span className="font-bold text-xl">{new Set(scoutingLocations.map(l => l.country)).size}</span>
              </div>
            </div>
          </div>

          {/* Location List */}
          <div className="bg-card rounded-lg p-4 border max-h-96 overflow-y-auto">
            <h4 className="font-bebas text-xl mb-3">SCOUTING LOCATIONS</h4>
            <div className="space-y-2">
              {scoutingLocations.map((location, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2 rounded hover:bg-accent transition-colors"
                >
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">{location.city}</div>
                    <div className="text-xs text-muted-foreground">{location.country}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoutingNetworkMap;
