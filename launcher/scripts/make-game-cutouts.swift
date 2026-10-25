import CoreImage
import ImageIO
import UniformTypeIdentifiers
import Vision

guard CommandLine.arguments.count == 3 else {
    fatalError("Usage: swift scripts/make-game-cutouts.swift input.jpg output.png")
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
let handler = VNImageRequestHandler(url: inputURL, options: [:])
let request = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([request])

guard let observation = request.results?.first, !observation.allInstances.isEmpty else {
    fatalError("Vision did not find a foreground subject in \(inputURL.lastPathComponent)")
}

let buffer = try observation.generateMaskedImage(
    ofInstances: observation.allInstances,
    from: handler,
    croppedToInstancesExtent: true
)
let image = CIImage(cvPixelBuffer: buffer)
let context = CIContext(options: [.useSoftwareRenderer: false])
guard let cgImage = context.createCGImage(image, from: image.extent),
      let destination = CGImageDestinationCreateWithURL(
        outputURL as CFURL,
        UTType.png.identifier as CFString,
        1,
        nil
      ) else {
    fatalError("Could not create transparent PNG at \(outputURL.path)")
}

CGImageDestinationAddImage(destination, cgImage, nil)
guard CGImageDestinationFinalize(destination) else {
    fatalError("Could not write \(outputURL.path)")
}
print("Wrote \(outputURL.path): \(cgImage.width)×\(cgImage.height)")
