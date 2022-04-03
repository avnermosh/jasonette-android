package com.jasonette.seed.Helper;

import android.content.Context;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;

// import com.google.android.gms.common.util.IOUtils;

import java.io.*;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.zip.*;
import java.util.Enumeration;
// import java.util.Date;

//avner
//- ZipUtil.java is based on https://gist.github.com/jkelley79/06ac85c4d85f9c5d437b with additions to
//        -- read the zip headers
//        -- read individual files

/**
 * ZipUtil is a program to provide simple zip operations such as creating a zip of a folder
 * or extracting a zip to a folder. This program utilizes the {@link java.util.zip.ZipFile} classes
 * to implement these functions.
 * <p>
 * As part of the creation of the zip the files are compressed to the default level of compression
 * and stored with the representative CRC. Also the time the file was last modified is preserved too.
 *
 * @author Jonathan Kelley
 * @version 1.0
 */
public class ZipUtil {
    /**
     * OK constant for ZipUtil class
     */
    private final static int ZIPUTIL_OK = 0;
    /**
     * Error constant for ZipUtil class
     */
    private final static int ZIPUTIL_ERROR = -1;
    /**
     * Constant for ZipUtil Create command
     */
    private final static int ZIPUTIL_CREATE = 0;
    /**
     * Constant for ZipUtil extract command
     */
    private final static int ZIPUTIL_EXTRACT = 1;

    private final static int ZIPUTIL_EXTRACT_MAIN_FILES_AND_FILE_HEADERS = 2;
    private final static int ZIPUTIL_GET_FILE_HEADERS = 3;

    /**
     * Constant for ZipUtil max buffer size
     */
    private final static int MAX_BUF_SIZE = 2048;
    /**
     * Constant for file separator regardless of OS
     **/
    private final static String FILESEP = "/";

    /**
     * Global counter for create or extract function
     */
    private static int numprocfiles;

    /**
     * Validates arguments to be suitable for the rest of the program
     *
     * @param args Arguments to the program
     * @return int Command type to be run i.e create, or extract. In error returns ZIPUTIL_ERROR
     */
    public static int checkArgs(String[] args) {

        int retcode = ZIPUTIL_ERROR;
        
        /*
            Currently we only accept 3 arguments and the first argument must be create or extract 
            Failure results in usage being printed
        */
        switch (args.length) {
            case 3:
                /* Find out which function we are running */
                if (args[0].equals("create")) {
                    retcode = ZIPUTIL_CREATE;
                } else if (args[0].equals("extract")) {
                    retcode = ZIPUTIL_EXTRACT;
                } else if (args[0].equals("extract_main_files_and_file_headers")) {
                    retcode = ZIPUTIL_EXTRACT_MAIN_FILES_AND_FILE_HEADERS;
                } else if (args[0].equals("ziputil_get_file_headers")) {
                    retcode = ZIPUTIL_GET_FILE_HEADERS;
                } else {
                    printError("Incorrect command specified: " + args[0]);
                    printUsage();
                }
                break;
            default:
                printUsage();
                break;
        }
        return retcode;
    }

    /**
     * Prints usage for the ZipUtil program
     */
    public static void printUsage() {
        System.out.println();
        System.out.println("ZipUtil: Usage");
        System.out.println("\t To extract a zip file specify the filename of the *existing* zip file first, and then the path for where to extract the zip.");
        System.out.println("\t   For example: java ZipUtil extract <zip file to extract> <path to extract to>\n");
        System.out.println("\t To create a zip file enter the filename of the *new* zip file to create first, and then the path to the files you want to zip.");
        System.out.println("\t   For example: java ZipUtil create <zip file to create> <path to file to zip>");
        System.out.println();
    }

    /**
     * Prints errors for the ZipUtil program
     *
     * @param error string to print out
     */
    public static void printError(String error) {
        System.out.println();
        System.out.println("ZipUtil: Error");
        System.out.println(error);
        System.out.println();
    }

    /**
     * Prints messages for the ZipUtil program
     *
     * @param msg string to print out
     */
    public static void printMsg(String msg) {
        System.out.println(msg);
    }

    /**
     * Checks whether file/directories exist
     *
     * @param path String path to check
     * @return boolean whether the path exists (true) or not (false)
     */
    public static boolean checkPath(String path) {
        return (new File(path)).exists();
    }

    /**
     * Compresses files and adds it to zipfile
     *
     * @param zipout  ZipOutputStream object which is opened and closed in createZip
     * @param curpath String to specify what the current local path is while walking the directory tree. Not an absolute path.
     * @param file    File object which represents file to compress and zip
     * @return int Flag for determining success (0) versus failure (ZIPUTIL_ERROR)
     */
    public static int compressFile(ZipOutputStream zipout, String curpath, File file) {
        int bytesread = 0;
        byte tmpbuffer[] = new byte[MAX_BUF_SIZE];
        int retcode = 0;

        String localfilepath = curpath + file.getName();
        try {
            CheckedInputStream cis = new CheckedInputStream(new FileInputStream(file.toString()), new CRC32());
            BufferedInputStream bis = new BufferedInputStream(cis);
            ZipEntry zipentry = new ZipEntry(localfilepath);
            
            /*
              Set the method to deflated (compressed)
              Set the entries lastModTime to preserve it on extract
            */
            zipentry.setMethod(ZipEntry.DEFLATED);
            zipentry.setTime(file.lastModified());
            zipout.putNextEntry(zipentry);

            /* Read the whole file from the disk and write it to the zipentry keeping a CRC check */
            while ((bytesread = bis.read(tmpbuffer, 0, tmpbuffer.length)) != -1) {
                zipout.write(tmpbuffer, 0, bytesread);
            }
            cis.close();
            bis.close();

            /* Set the crc to the calculated value on the buffer stream */
            zipentry.setCrc(cis.getChecksum().getValue());
            zipout.closeEntry();
        } catch (IOException e) {
            printError(e.toString());
            retcode = ZIPUTIL_ERROR;
        }
        return retcode;
    }

    /**
     * Walks directory tree recursively compressing files and adding it to zipfile
     *
     * @param dir     Directory object which is used to retrieve file list and subdirectories
     * @param zipout  ZipOutputStream object which is opened and closed in createZip
     * @param curpath String to specify what the current local path is while walking the directory tree. Not an absolute path.
     * @return int Flag for determining success (0) versus failure (ZIPUTIL_ERROR)
     */
    public static int walkTree(File dir, ZipOutputStream zipout, String curpath) {
        
        /*
           Get the list of files and create a buffer to do the file io
        */
        File filelist[] = dir.listFiles();
        byte tmpbuffer[] = new byte[MAX_BUF_SIZE];
        int retcode = 0;

        try {   
            /*
                iterate through the list of files
                    for directories we add the directory entry and recurse down
                    for files we add the file entry, read the file, and write the compressed form
            */
            for (int i = 0; i < filelist.length; i++) {
                if (filelist[i].isDirectory()) {
                    String dirname = curpath + filelist[i].getName() + FILESEP;
                    printMsg(" Adding: " + dirname);
                    zipout.putNextEntry(new ZipEntry(dirname));
                    zipout.closeEntry();
                    if ((retcode = walkTree(filelist[i], zipout, dirname)) != 0) {
                        return retcode;
                    }
                } else {
                    String filename = curpath + filelist[i].getName();
                    printMsg(" Adding: " + filename);
                    if ((retcode = compressFile(zipout, curpath, filelist[i])) != 0) {
                        return retcode;
                    }
                    numprocfiles++;
                }

            } // end for each file in filelist
        } catch (IOException e) {
            printError(e.toString());
            retcode = ZIPUTIL_ERROR;
        }
        return retcode;
    }

    /**
     * Creates zipfile of inputpath and outputs compressed files into zipfile
     *
     * @param zipfile   String value of the zipfile name passed in by user
     * @param inputpath String value of the location of the files/directories to add to zip
     * @return int Flag for determining success (0) versus failure (ZIPUTIL_ERROR)
     */
    public static int createZip(String zipfile, String inputpath) {
        int retcode = 0;
        File root = new File(inputpath);
        /*
            Handle two cases
            - The user passes a directory as for what to zip
            - The user passes a file to zip with no directories
        */
        try {

            // Open a ZipOutputStream to the zipfile and set the method to deflated for compression
            ZipOutputStream zipout = new ZipOutputStream(new FileOutputStream(zipfile));
            zipout.setMethod(ZipOutputStream.DEFLATED);

            if (root.isDirectory()) {
                zipout.putNextEntry(new ZipEntry(root.getName() + FILESEP));
                zipout.closeEntry();
                printMsg(" Adding: " + root.getName() + FILESEP);
                retcode = walkTree(root, zipout, root.getName() + FILESEP);
            } else {
                // single file....just zip this file
                retcode = compressFile(zipout, "", root);
                printMsg(" Adding: " + root.getName() + FILESEP);
                numprocfiles++;
            }
            zipout.close();
        } catch (IOException e) {
            printError(e.toString());
            retcode = ZIPUTIL_ERROR;
        }
        return retcode;
    }

    static void deleteRecursive(File fileOrDirectory) {
        if (fileOrDirectory.isDirectory())
            for (File child : fileOrDirectory.listFiles())
                deleteRecursive(child);

        fileOrDirectory.delete();
    }

    @RequiresApi(api = Build.VERSION_CODES.N)
    public static boolean stringContainsItemFromList(String inputStr, String[] items) {
        return Arrays.stream(items).anyMatch(inputStr::contains);
    }

    public static int getZip_FileHeaders(String zipFileName, Context context, Map<String, Zipinfo_header> zipFileInfoFiles) throws Exception {
        int retcode = 0;
        try {

            InputStream zipInputStream;
            if(zipFileName.startsWith("file/")) {
                // load from internal asset (filename is in variable colZipPath)
                zipInputStream = context.getAssets().open(zipFileName);
                // int size = zipInputStream.available();
            }
            else
            {
                // load from external storage (filename is in variable zipFileName)

                // sanity check - check that the file exists
                File internalFile = new File(zipFileName);
                if (!internalFile.exists()) {
                    StringBuilder error = new StringBuilder();
                    error.append("File does not exist: ");
                    error.append(zipFileName);
                    throw new Exception("error occurred: " + error.toString());
                }
                zipInputStream = new FileInputStream(zipFileName);
            }

            // is = new FileInputStream(path + zipname);
            ZipInputStream zipIs = new ZipInputStream(new BufferedInputStream(zipInputStream));
            // ZipInputStream zipIs;
            ZipEntry zipentry = null;

            // https://stackoverflow.com/questions/7046951/how-can-i-find-the-file-offset-of-a-zipfile-entry-in-java
            long offsetInZipFile = 0;

            while ((zipentry = zipIs.getNextEntry()) != null) {
                printMsg("Extracting header for: " + zipentry.getName());

                // get header
                long zipentryFileDataSize = 0;
                long zipentryExtraFieldSize = zipentry.getExtra() == null ? 0 : zipentry.getExtra().length;

                int NUM_FIXED_BYTES_IN_ZIPENTRY_HEADER = 30;
                long zipentryHeaderSize = NUM_FIXED_BYTES_IN_ZIPENTRY_HEADER + zipentry.getName().length() + zipentryExtraFieldSize;

                if (!zipentry.isDirectory()) {
                    zipentryFileDataSize = zipentry.getCompressedSize();

                    // create header structure
                    String zipentryFilename = zipentry.getName();
                    Zipinfo_header zipinfo_header = new Zipinfo_header(offsetInZipFile, zipentryHeaderSize, zipentryFileDataSize, zipentryFilename);
                    // printMsg(zipinfo_header.toString());

                    zipFileInfoFiles.put(zipentryFilename, zipinfo_header);
                    System.out.println(zipFileInfoFiles.get(zipentryFilename));
                    numprocfiles++;
                }
                offsetInZipFile += (zipentryHeaderSize + zipentryFileDataSize);

                zipIs.closeEntry();
            }
            zipIs.close();
            System.out.println(zipFileInfoFiles);

        } catch (IOException e) {
            printError(e.toString());
            retcode = ZIPUTIL_ERROR;
        }
        return retcode;
    }

    @RequiresApi(api = Build.VERSION_CODES.N)
    public static int extractZip_mainFilesAndFileHeaders(String zipfile, String outputpath) {
        int retcode = 0;

        try {
            ZipFile zipFile = new ZipFile(zipfile);
            Enumeration<? extends ZipEntry> items = zipFile.entries();

            // https://stackoverflow.com/questions/7046951/how-can-i-find-the-file-offset-of-a-zipfile-entry-in-java
            long offsetInZipFile = 0;

            /*
                iterate through the zipfile
                - for directories create the necessary directory structure
                - for files read the compressed data and write to the specified file
            */
            while (items.hasMoreElements()) {
                ZipEntry zipentry = items.nextElement();
                printMsg("Extracting header for: " + zipentry.getName());

                String filepath = outputpath + FILESEP + zipentry.getName();

                String relativeFilepath = zipentry.getName();

                // get header
                long zipentryFileDataSize = 0;
                long zipentryExtraFieldSize = zipentry.getExtra() == null ? 0 : zipentry.getExtra().length;

                int NUM_FIXED_BYTES_IN_ZIPENTRY_HEADER = 30;
                long zipentryHeaderSize = NUM_FIXED_BYTES_IN_ZIPENTRY_HEADER + zipentry.getName().length() + zipentryExtraFieldSize;

                if (!zipentry.isDirectory()) {
                    zipentryFileDataSize = zipentry.getCompressedSize();

                    // create header structure
                    Zipinfo_header zipinfo_header = new Zipinfo_header(offsetInZipFile, zipentryHeaderSize, zipentryFileDataSize, zipentry.getName());
                    printMsg(zipinfo_header.toString());

                    String[] zipfilesToExtractData = {
                            "json",
                            "structure"
                    };
                    boolean doExtractZipData = stringContainsItemFromList(relativeFilepath, zipfilesToExtractData);

                    if (doExtractZipData) {

                        printMsg("Extracting data for: " + zipentry.getName());
                        if (create_dir_if_needed(filepath, zipentry) == ZIPUTIL_ERROR) {
                            return ZIPUTIL_ERROR;
                        }

                        if (extractZipEntryData(zipFile, filepath, zipentry) == ZIPUTIL_ERROR) {
                            printError("Failed to extractZipEntryData for: " + filepath);
                            return ZIPUTIL_ERROR;
                        }
                    }

                    numprocfiles++;
                }
                offsetInZipFile += (zipentryHeaderSize + zipentryFileDataSize);

            } // end while hasMoreElements
            zipFile.close();

        } catch (IOException e) {
            printError(e.toString());
            retcode = ZIPUTIL_ERROR;
        }
        return retcode;
    }

    // my class
    public static class Zipinfo_header {
        // public member variable
        public long offsetInZipFile;
        public long headerSize;
        public long compressedSize;
        public String filename;

        // default constructor
        public Zipinfo_header(long otherOffsetInZipFile, long otherHeaderSize, long otherCompressedSize, String otherFilename) {
            offsetInZipFile = otherOffsetInZipFile;
            headerSize = otherHeaderSize;
            compressedSize = otherCompressedSize;
            filename = otherFilename;
        }

        @Override
        public String toString() {
            return new StringBuilder()
                    .append("{Zipinfo_header:")
                    .append(" offsetInZipFile=").append(offsetInZipFile)
                    .append(", headerSize=").append(headerSize)
                    .append(", compressedSize=").append(compressedSize)
                    .append(", filename=").append(filename)
                    .append("}")
                    .toString();
        }
    }

    public static byte[] extractZipEntryData_toArrayBuffer(InputStream inputStream, int sliceBeg, int numBytesToRead, byte[] byteArray) throws Exception {
        // int retcode = 0;
        try {
            BufferedInputStream bis = new BufferedInputStream(inputStream);
            // bis.skip(sliceBeg);
            byteArray = JasonHelper.readBytes(bis, sliceBeg, numBytesToRead);
            bis.close();
        } catch (IOException e) {
            printError(e.toString());
            throw new Exception("Exception message");
            // retcode = ZIPUTIL_ERROR;
        }
        return byteArray;

    }

    public static int extractZipEntryData(@NonNull ZipFile zipFile, String filepath, ZipEntry zipentry) {
        int retcode = 0;
        try {
            int bytesread = 0;
            byte tmpbuffer[] = new byte[MAX_BUF_SIZE];

            CheckedOutputStream cos = new CheckedOutputStream(new FileOutputStream(filepath), new CRC32());
            BufferedOutputStream bos = new BufferedOutputStream(cos);
            BufferedInputStream bis = new BufferedInputStream(zipFile.getInputStream(zipentry));

            /* Read the whole file from the zipFile entry and write it to stored file name keeping a CRC check */
            while ((bytesread = bis.read(tmpbuffer, 0, tmpbuffer.length)) != -1) {
                bos.write(tmpbuffer, 0, bytesread);
            }
            bis.close();
            bos.flush();
            bos.close();

            /* Set the last modified time of the unzipped file to the saved time in the zipFile */
            File f = new File(filepath);
            f.setLastModified(zipentry.getTime());

            final boolean checksumOk = (zipentry.getCrc() == cos.getChecksum().getValue());
            printMsg(" Extracting: " + zipentry.getName() + (checksumOk ? "...OK!" : "....checksum invalid!"));

            if (!checksumOk) {
                retcode = ZIPUTIL_ERROR;
            }
        } catch (IOException e) {
            printError(e.toString());
            retcode = ZIPUTIL_ERROR;
        }
        return retcode;
    }

    public static int create_dir_if_needed(String filepath, ZipEntry zipentry) {
        String filedir = "";
        if (zipentry.isDirectory() == false) {
            filedir = filepath.substring(0, filepath.lastIndexOf("/") + 1);
        }
        File directory = new File(filedir);
        if (!directory.exists()) {
            printMsg(" Creating directory for: " + filedir);
            boolean success = directory.mkdirs();
            if (!success) {
                printError("Failed to make directory structure for " + directory);
                return ZIPUTIL_ERROR;
            }
        }
        return ZIPUTIL_OK;
    }

    /**
     * Extracts zipfile to specified outputpath
     *
     * @param zipfile    String value of the zipfile name passed in by user
     * @param outputpath String value of the location of the directory to unzip the files into
     * @return int Flag for determining success (0) versus failure (ZIPUTIL_ERROR)
     */
    public static int extractZip(String zipfile, String outputpath) {
        int retcode = 0;

        try {
            ZipFile zipFile = new ZipFile(zipfile);
            Enumeration<? extends ZipEntry> items = zipFile.entries();

            /*
                iterate through the zipfile
                - for directories create the necessary directory structure
                - for files read the compressed data and write to the specified file
            */
            while (items.hasMoreElements()) {
                ZipEntry zipentry = items.nextElement();
                String filepath = outputpath + FILESEP + zipentry.getName();

                if (create_dir_if_needed(filepath, zipentry) == ZIPUTIL_ERROR) {
                    return ZIPUTIL_ERROR;
                }

                if (zipentry.isDirectory() == false) {

                    if (extractZipEntryData(zipFile, filepath, zipentry) == ZIPUTIL_ERROR) {
                        printError("Failed to extractZipEntryData for: " + filepath);
                        return ZIPUTIL_ERROR;
                    }

                    numprocfiles++;
                } //end else

            } // end while hasMoreElements
            zipFile.close();

        } catch (IOException e) {
            printError(e.toString());
            retcode = ZIPUTIL_ERROR;
        }
        return retcode;
    }

}