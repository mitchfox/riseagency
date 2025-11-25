import { MapPin } from "lucide-react";
import { useState } from "react";

const ScoutingNetworkMap = () => {
  const [viewBox, setViewBox] = useState("0 0 1000 600");
  const [isZoomed, setIsZoomed] = useState(false);
  // Detailed European countries borders based on reference
  const europeanCountries = [
    { name: "Iceland", path: "M 240 80 L 250 75 L 265 75 L 275 80 L 280 90 L 278 100 L 270 105 L 255 108 L 245 105 L 238 95 Z" },
    { name: "Norway", path: "M 520 40 L 535 35 L 550 38 L 565 45 L 580 60 L 595 85 L 605 110 L 610 135 L 608 155 L 600 175 L 588 190 L 575 200 L 560 205 L 545 200 L 535 185 L 528 165 L 525 140 L 523 110 L 522 85 L 520 60 Z" },
    { name: "Sweden", path: "M 610 135 L 625 130 L 640 132 L 655 140 L 668 155 L 678 175 L 682 195 L 680 215 L 672 230 L 658 240 L 642 245 L 628 242 L 615 230 L 608 210 L 605 185 L 607 160 Z" },
    { name: "Finland", path: "M 682 80 L 700 75 L 718 80 L 735 95 L 748 115 L 755 138 L 758 165 L 755 188 L 745 205 L 728 215 L 710 218 L 695 210 L 685 195 L 680 175 L 682 150 L 685 125 L 688 100 Z" },
    { name: "Russia", path: "M 758 165 L 780 160 L 810 165 L 840 175 L 870 190 L 895 210 L 915 235 L 928 265 L 935 295 L 932 325 L 920 350 L 900 370 L 875 385 L 848 392 L 820 390 L 795 380 L 775 360 L 760 335 L 752 305 L 750 275 L 752 245 L 755 215 Z" },
    { name: "United Kingdom", path: "M 420 240 L 435 235 L 450 235 L 465 240 L 478 250 L 488 265 L 492 282 L 490 298 L 482 312 L 470 322 L 455 327 L 440 328 L 425 323 L 413 312 L 408 295 L 408 278 L 412 262 L 418 248 Z M 460 215 L 472 210 L 485 212 L 495 220 L 500 232 L 498 245 L 490 255 L 478 258 L 465 255 L 455 245 L 452 232 L 455 220 Z" },
    { name: "Ireland", path: "M 365 260 L 378 255 L 392 257 L 403 265 L 410 278 L 412 293 L 408 308 L 398 320 L 385 327 L 370 328 L 357 323 L 348 312 L 345 297 L 347 282 L 353 268 Z" },
    { name: "Portugal", path: "M 285 470 L 298 465 L 312 468 L 323 478 L 330 493 L 332 510 L 328 528 L 318 543 L 305 553 L 290 558 L 275 555 L 265 545 L 260 528 L 262 510 L 268 493 L 278 478 Z" },
    { name: "Spain", path: "M 323 478 L 350 472 L 380 470 L 410 473 L 440 480 L 468 492 L 490 508 L 505 527 L 512 548 L 510 570 L 500 588 L 482 600 L 458 605 L 430 605 L 402 600 L 375 590 L 350 575 L 330 555 L 320 535 L 318 512 L 323 492 Z" },
    { name: "France", path: "M 440 325 L 470 320 L 500 322 L 528 330 L 552 345 L 570 365 L 580 388 L 585 413 L 582 438 L 570 460 L 550 475 L 525 483 L 498 485 L 470 480 L 445 468 L 425 450 L 413 428 L 408 405 L 410 380 L 418 355 L 430 338 Z" },
    { name: "Belgium", path: "M 495 295 L 508 292 L 520 295 L 530 303 L 535 315 L 532 327 L 523 335 L 510 338 L 497 335 L 488 325 L 485 312 L 488 302 Z" },
    { name: "Netherlands", path: "M 505 270 L 520 267 L 535 270 L 548 280 L 555 293 L 552 307 L 543 318 L 528 323 L 515 320 L 505 308 L 502 293 L 503 280 Z" },
    { name: "Germany", path: "M 535 290 L 565 285 L 595 288 L 622 298 L 645 313 L 662 332 L 672 355 L 675 378 L 670 400 L 655 418 L 635 430 L 610 437 L 585 438 L 560 432 L 540 418 L 525 398 L 518 375 L 518 350 L 523 325 L 530 305 Z" },
    { name: "Denmark", path: "M 545 235 L 560 232 L 575 235 L 588 245 L 595 258 L 595 272 L 588 285 L 575 292 L 560 293 L 548 287 L 542 273 L 542 258 L 545 245 Z M 520 258 L 530 255 L 540 258 L 545 268 L 543 278 L 535 285 L 525 286 L 517 280 L 515 270 L 518 263 Z" },
    { name: "Poland", path: "M 655 265 L 685 262 L 715 268 L 742 280 L 765 297 L 780 318 L 788 342 L 788 365 L 780 387 L 763 405 L 740 417 L 715 423 L 690 422 L 665 413 L 645 398 L 632 378 L 625 355 L 625 330 L 632 305 L 643 285 Z" },
    { name: "Czech Republic", path: "M 615 355 L 635 350 L 655 353 L 672 363 L 682 378 L 685 395 L 678 410 L 663 420 L 645 423 L 627 420 L 613 408 L 608 390 L 610 373 L 613 360 Z" },
    { name: "Austria", path: "M 590 375 L 612 370 L 635 373 L 655 383 L 668 398 L 672 415 L 665 430 L 650 440 L 630 443 L 610 440 L 593 428 L 585 410 L 585 393 L 588 382 Z" },
    { name: "Switzerland", path: "M 520 380 L 535 377 L 550 380 L 563 390 L 568 403 L 563 415 L 550 423 L 535 425 L 522 420 L 515 408 L 515 395 L 518 387 Z" },
    { name: "Italy", path: "M 545 420 L 565 415 L 585 418 L 603 428 L 618 443 L 628 463 L 633 488 L 632 515 L 623 542 L 608 565 L 588 582 L 565 592 L 543 595 L 523 588 L 508 573 L 500 553 L 497 530 L 500 505 L 508 480 L 520 458 L 535 440 Z" },
    { name: "Slovenia", path: "M 608 405 L 622 402 L 635 408 L 643 420 L 643 433 L 635 443 L 622 445 L 610 440 L 605 428 L 605 415 Z" },
    { name: "Croatia", path: "M 635 420 L 655 417 L 675 423 L 690 435 L 698 452 L 698 470 L 688 485 L 672 493 L 655 493 L 640 485 L 630 468 L 628 450 L 632 435 Z" },
    { name: "Bosnia", path: "M 655 445 L 670 443 L 683 450 L 690 463 L 688 478 L 678 488 L 663 490 L 650 483 L 645 468 L 648 455 Z" },
    { name: "Serbia", path: "M 690 440 L 708 438 L 725 445 L 737 458 L 742 475 L 738 492 L 725 505 L 708 510 L 692 508 L 680 495 L 675 478 L 678 460 L 685 448 Z" },
    { name: "Hungary", path: "M 650 385 L 675 382 L 700 388 L 720 400 L 733 418 L 738 438 L 733 458 L 718 472 L 698 478 L 675 478 L 655 468 L 640 453 L 635 433 L 638 413 L 645 398 Z" },
    { name: "Romania", path: "M 738 380 L 765 378 L 790 385 L 810 400 L 822 420 L 825 443 L 818 465 L 802 482 L 780 492 L 755 495 L 733 488 L 718 470 L 712 448 L 715 425 L 723 403 L 732 390 Z" },
    { name: "Bulgaria", path: "M 742 485 L 765 483 L 788 490 L 805 503 L 815 520 L 815 538 L 805 553 L 785 562 L 762 563 L 742 555 L 728 540 L 725 520 L 730 503 L 738 493 Z" },
    { name: "Greece", path: "M 695 520 L 715 518 L 735 525 L 752 540 L 762 560 L 765 582 L 758 600 L 742 605 L 720 605 L 700 595 L 685 578 L 680 558 L 683 538 L 690 528 Z" },
    { name: "Albania", path: "M 685 495 L 698 493 L 710 500 L 718 515 L 718 532 L 710 545 L 697 550 L 685 545 L 678 530 L 678 512 L 682 503 Z" },
    { name: "North Macedonia", path: "M 710 480 L 725 478 L 738 485 L 745 498 L 743 512 L 733 523 L 720 525 L 708 518 L 703 505 L 705 490 Z" },
    { name: "Slovakia", path: "M 655 330 L 675 328 L 695 333 L 710 345 L 718 363 L 715 380 L 703 393 L 685 398 L 668 395 L 655 383 L 650 365 L 650 348 L 652 338 Z" },
    { name: "Ukraine", path: "M 788 305 L 820 302 L 855 310 L 885 325 L 910 345 L 925 370 L 930 398 L 925 425 L 910 448 L 888 465 L 860 475 L 830 478 L 802 473 L 778 458 L 760 438 L 750 415 L 748 388 L 753 360 L 763 335 L 778 318 Z" },
    { name: "Belarus", path: "M 715 250 L 745 248 L 775 255 L 800 270 L 818 290 L 828 315 L 828 340 L 818 363 L 800 380 L 775 388 L 750 388 L 728 378 L 712 360 L 705 338 L 705 315 L 710 290 L 715 268 Z" },
    { name: "Lithuania", path: "M 680 235 L 700 233 L 720 238 L 735 250 L 742 268 L 740 285 L 728 298 L 710 303 L 692 300 L 678 288 L 673 270 L 675 253 L 678 243 Z" },
    { name: "Latvia", path: "M 685 200 L 705 198 L 725 203 L 740 215 L 748 233 L 745 250 L 732 263 L 712 268 L 693 263 L 680 248 L 677 230 L 680 213 Z" },
    { name: "Estonia", path: "M 690 175 L 710 173 L 730 178 L 745 190 L 750 207 L 745 223 L 730 235 L 710 238 L 693 230 L 685 215 L 683 198 L 687 185 Z" },
    { name: "Moldova", path: "M 775 395 L 790 393 L 805 400 L 815 415 L 818 433 L 812 448 L 798 458 L 782 460 L 768 453 L 760 438 L 760 420 L 765 405 Z" },
    { name: "Turkey", path: "M 815 538 L 850 535 L 890 540 L 930 550 L 970 565 L 1000 580 L 1000 600 L 960 600 L 920 593 L 880 583 L 845 570 L 815 558 Z" },
  ];

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

  const handleMapClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    
    const svgPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());
    
    if (isZoomed) {
      // Zoom out
      setViewBox("0 0 1000 600");
      setIsZoomed(false);
    } else {
      // Zoom in to clicked location
      const zoomLevel = 2.5;
      const newWidth = 1000 / zoomLevel;
      const newHeight = 600 / zoomLevel;
      const newX = Math.max(0, Math.min(1000 - newWidth, svgPoint.x - newWidth / 2));
      const newY = Math.max(0, Math.min(600 - newHeight, svgPoint.y - newHeight / 2));
      
      setViewBox(`${newX} ${newY} ${newWidth} ${newHeight}`);
      setIsZoomed(true);
    }
  };

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
            viewBox={viewBox}
            className="w-full h-auto cursor-pointer transition-all duration-700 ease-in-out"
            style={{ maxHeight: "600px" }}
            onClick={handleMapClick}
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
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="1.5"
                  opacity="0.6"
                  className="transition-opacity duration-200"
                >
                  <title>{country.name}</title>
                </path>
              </g>
            ))}

            {/* Scouting Location Points */}
            {scoutingLocations.map((location, idx) => {
              const patternId = `flag-${location.country.toLowerCase().replace(/ /g, '-')}`;
              return (
                <g key={idx}>
                  {/* Pulse effect */}
                  <circle
                    cx={location.x}
                    cy={location.y}
                    r="12"
                    fill="hsl(var(--primary))"
                    className="animate-ping opacity-20"
                  />
                  {/* Main marker with country flag fill */}
                  <circle
                    cx={location.x}
                    cy={location.y}
                    r="6"
                    fill={`url(#${patternId})`}
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer hover:r-8 transition-all"
                  >
                    <title>{location.city}, {location.country}</title>
                  </circle>
                </g>
              );
            })}

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
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{isZoomed ? "Click to zoom out" : "Click anywhere to zoom in"}</span>
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
